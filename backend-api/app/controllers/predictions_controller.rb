class PredictionsController < ApplicationController
  before_action :authenticate_request,
                only: [:create, :index, :show, :analyze, :enqueue, :update, :destroy]

  # POST /predictions/analyze
  # Legacy synchronous endpoint. Kept for backward compatibility.
  def analyze
    unless params[:file].present?
      return render json: { error: "Файл не передан" }, status: :bad_request
    end

    model_id = params[:model_id].presence || "vision-v1"
    ml_response = call_ml_service(params[:file], model_id)

    if ml_response[:status] == "success"
      weather_code = ml_response[:prediction][:class].upcase
      weather_condition = WeatherCondition.active.find_by(code: weather_code)
      locale = current_user.locale || "ru"
      condition_name = weather_condition&.translated(locale)&.name || weather_code

      render json: {
        status: "success",
        prediction: {
          weather_condition: condition_name,
          weather_code: weather_code,
          confidence: ml_response[:prediction][:confidence],
          probabilities: ml_response[:prediction][:probabilities]
        }
      }
    elsif [400, 422].include?(ml_response[:http_status])
      render json: {
        error: "Некорректный файл",
        details: ml_response[:details]
      }, status: :unprocessable_content
    else
      render json: {
        error: "Ошибка ML-сервиса",
        details: ml_response
      }, status: :internal_server_error
    end
  end

  # POST /predictions/async
  # Stores the image and schedules classification in Sidekiq.
  def enqueue
    uploaded_file = params[:file]
    unless uploaded_file.respond_to?(:tempfile)
      return render json: { error: "Файл не передан" }, status: :bad_request
    end

    prediction = nil
    storage_key = PredictionImageStorage.store!(uploaded_file)
    image_path = PredictionImageStorage.path_for(storage_key)
    model_id = params[:model_id].presence || "vision-v1"

    prediction = current_user.predictions.create!(
      name: params[:name].presence || File.basename(uploaded_file.original_filename),
      status: "pending",
      storage_key: storage_key,
      original_filename: File.basename(uploaded_file.original_filename),
      image_size_bytes: uploaded_file.size,
      image_checksum: Digest::SHA256.file(image_path).hexdigest,
      ml_model_version: model_id
    )

    begin
      enqueued_job = AnalyzePredictionJob.perform_later(prediction.id)
      raise "Active Job did not enqueue the prediction" unless enqueued_job&.successfully_enqueued?
    rescue StandardError => error
      Rails.logger.error(
        "[PredictionsController#enqueue] Failed to enqueue prediction_id=#{prediction.id}: " \
        "#{error.class}: #{error.message}"
      )
      prediction.fail!(
        error_code: "QUEUE_UNAVAILABLE",
        error_message: "Не удалось добавить анализ в очередь"
      )

      return render json: {
        error: "Сервис обработки временно недоступен",
        prediction: prediction_summary(prediction)
      }, status: :service_unavailable
    end

    render json: {
      status: "accepted",
      prediction: prediction_summary(prediction)
    }, status: :accepted
  rescue PredictionImageStorage::InvalidUpload => error
    PredictionImageStorage.delete!(storage_key) if storage_key.present? && prediction.nil?
    render json: { error: error.message }, status: :unprocessable_content
  rescue ActiveRecord::RecordInvalid => error
    PredictionImageStorage.delete!(storage_key) if storage_key.present? && prediction.nil?
    render json: { error: error.record.errors.full_messages }, status: :unprocessable_entity
  rescue ActiveRecord::RecordNotUnique
    PredictionImageStorage.delete!(storage_key) if storage_key.present? && prediction.nil?
    render json: { error: "Это изображение уже было отправлено на анализ" }, status: :conflict
  end

  # POST /predictions
  # Saves a result produced by the legacy synchronous frontend flow.
  def create
    weather_code = params[:weather_code] || "UNKNOWN"
    weather_condition = WeatherCondition.active.find_by(code: weather_code)

    parsed_probs = if params[:probabilities].present?
      JSON.parse(params[:probabilities])
    else
      { weather_code => params[:confidence] }
    end

    prediction = current_user.predictions.new(
      name: params[:name].presence || "Без названия",
      status: "completed",
      weather_condition: weather_condition,
      confidence: params[:confidence],
      class_probabilities: parsed_probs,
      ml_model_version: params[:model_version] || "mock-v1",
      ml_service_version: "mock-v1"
    )

    if params[:image].present?
      file = params[:image]
      prediction.storage_key = "temp_#{SecureRandom.hex(8)}"
      prediction.original_filename = file.original_filename
      prediction.image_size_bytes = file.size
    end

    if prediction.save
      render json: { status: "success", prediction: { id: prediction.id } }, status: :created
    else
      render json: { error: prediction.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # GET /predictions
  def index
    predictions = current_user.predictions
                              .where(deleted_at: nil)
                              .recent
                              .limit(10)
                              .includes(:weather_condition)

    render json: {
      predictions: predictions.map { |prediction| prediction_summary(prediction) }
    }
  end

  # GET /predictions/:id
  def show
    prediction = current_user.predictions.where(deleted_at: nil).find(params[:id])
    render json: { prediction: prediction_summary(prediction) }
  end

  # PATCH/PUT /predictions/:id
  def update
    prediction = current_user.predictions.where(deleted_at: nil).find(params[:id])

    if prediction.update(name: params[:name])
      render json: { status: "success", name: prediction.name }
    else
      render json: { error: prediction.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /predictions/:id
  def destroy
    prediction = current_user.predictions.where(deleted_at: nil).find(params[:id])
    prediction.destroy
    head :no_content
  end

  private

  def prediction_summary(prediction)
    top_probability_class = prediction.class_probabilities&.max_by { |_key, value| value }&.first
    condition = prediction.weather_condition
    locale = current_user.locale || "ru"

    {
      id: prediction.id,
      public_id: prediction.public_id,
      name: prediction.name,
      status: prediction.status,
      weather_condition: condition&.translated(locale)&.name || condition&.code || top_probability_class,
      weather_code: condition&.code || top_probability_class,
      confidence: prediction.confidence,
      probabilities: prediction.class_probabilities,
      ml_model_version: prediction.ml_model_version,
      original_filename: prediction.original_filename,
      processing_duration_ms: prediction.processing_duration_ms,
      error_code: prediction.error_code,
      created_at: prediction.created_at,
      finished_at: prediction.finished_at
    }
  end

  # Existing synchronous ML request helper.
  def call_ml_service(file, model_id)
    require "net/http"
    require "uri"

    uri = URI(ENV.fetch("ML_SERVICE_URL", "http://localhost:8000/predict"))
    boundary = "----RubyFormBoundary#{SecureRandom.hex(10)}"

    body = []
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{file.original_filename}\"\r\n"
    body << "Content-Type: #{file.content_type}\r\n\r\n"
    body << file.read
    body << "\r\n"
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"model_id\"\r\n\r\n"
    body << model_id.to_s
    body << "\r\n--#{boundary}--\r\n"

    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri.request_uri)
    request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"
    request.body = body.join

    response = http.request(request)

    if response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body, symbolize_names: true)
    else
      details = begin
        JSON.parse(response.body.to_s, symbolize_names: true)
      rescue JSON::ParserError
        { body: response.body.to_s }
      end

      {
        status: "error",
        http_status: response.code.to_i,
        details: details
      }
    end
  rescue StandardError => error
    { status: "error", message: error.message }
  end
end
