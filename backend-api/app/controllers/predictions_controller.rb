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
  # Persists the prediction and its outbox entry in the same DB transaction.
  # Queue delivery may be retried asynchronously if Redis is unavailable.
  def enqueue
    uploaded_file = params[:file]
    unless uploaded_file.respond_to?(:tempfile)
      return render_api_error("INVALID_UPLOAD", "An image file is required", status: :unprocessable_content)
    end

    prediction = nil
    dispatch = nil
    storage_key = PredictionImageStorage.store!(uploaded_file)
    image_path = PredictionImageStorage.path_for(storage_key)
    model_id = params[:model_id].presence || "vision-v1"

    Prediction.transaction do
      prediction = current_user.predictions.create!(
        name: params[:name].presence || File.basename(uploaded_file.original_filename),
        status: "pending",
        storage_key: storage_key,
        original_filename: File.basename(uploaded_file.original_filename),
        image_size_bytes: uploaded_file.size,
        image_checksum: Digest::SHA256.file(image_path).hexdigest,
        ml_model_version: model_id
      )

      # This row is committed atomically with Prediction. It survives a Rails
      # crash before or during the Redis enqueue operation.
      dispatch = PredictionDispatch.create!(prediction: prediction)
    end

    PredictionStatusBroadcaster.broadcast(prediction)
    PredictionDispatchService.call(dispatch.id)

    render json: {
      status: "accepted",
      prediction: serialize_prediction(prediction)
    }, status: :accepted
  rescue PredictionImageStorage::StorageUnavailable => error
    cleanup_unpersisted_image(storage_key, prediction)
    Rails.logger.error("[PredictionsController] image storage unavailable: #{error.message}")
    render_api_error("STORAGE_UNAVAILABLE", "Image storage is temporarily unavailable", status: :service_unavailable)
  rescue PredictionImageStorage::InvalidUpload => error
    cleanup_unpersisted_image(storage_key, prediction)
    render_api_error("INVALID_UPLOAD", error.message, status: :unprocessable_content)
  rescue ActiveRecord::RecordInvalid => error
    cleanup_unpersisted_image(storage_key, prediction)
    render_api_error(
      "INVALID_UPLOAD",
      "The uploaded prediction could not be saved",
      details: { errors: error.record.errors.full_messages },
      status: :unprocessable_entity
    )
  rescue ActiveRecord::RecordNotUnique
    cleanup_unpersisted_image(storage_key, prediction)
    render_api_error("DUPLICATE_IMAGE", "This image has already been submitted", status: :conflict)
  rescue StandardError => error
    cleanup_unpersisted_image(storage_key, prediction)
    Rails.logger.error("[PredictionsController] enqueue failed: #{error.class}: #{error.message}")
    render_api_error("INTERNAL_ERROR", "An unexpected error occurred", status: :internal_server_error)
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
    page = positive_integer_param(:page, default: 1)
    per_page = [positive_integer_param(:per_page, default: 20), 100].min
    scope = current_user.predictions
                        .where(deleted_at: nil)
                        .recent
                        .includes(weather_condition: :translations)
    total_count = scope.count
    predictions = scope.offset((page - 1) * per_page).limit(per_page)

    render json: {
      predictions: predictions.map { |prediction| serialize_prediction(prediction) },
      pagination: {
        page: page,
        per_page: per_page,
        total_count: total_count,
        total_pages: (total_count.to_f / per_page).ceil
      }
    }
  end

  # GET /predictions/:id
  def show
    prediction = current_user.predictions
                             .where(deleted_at: nil)
                             .includes(weather_condition: :translations)
                             .find(params[:id])
    render json: { prediction: serialize_prediction(prediction) }
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

  def serialize_prediction(prediction)
    PredictionSerializer.new(
      prediction,
      locale: current_user.locale.presence || "ru"
    ).as_json
  end

  def positive_integer_param(name, default:)
    value = Integer(params[name].to_s, 10)
    value.positive? ? value : default
  rescue ArgumentError, TypeError
    default
  end

  def cleanup_unpersisted_image(storage_key, prediction)
    return if storage_key.blank? || prediction&.persisted?

    PredictionImageStorage.delete!(storage_key)
  rescue PredictionImageStorage::MissingImage
    nil
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
