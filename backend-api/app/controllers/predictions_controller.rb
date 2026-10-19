class PredictionsController < ApplicationController
  before_action :authenticate_request, only: [:create, :index]

  # POST /predictions
  def create
    unless params[:file].present?
      return render json: { error: "Файл не передан" }, status: :bad_request
    end

    file = params[:file]

    # 1. Создаем запись Prediction со статусом "pending"
    prediction = current_user.predictions.create!(
      status: "pending",
      storage_key: "temp_#{SecureRandom.hex(8)}", # Временно, пока не настроим Active Storage
      original_filename: file.original_filename,
      image_size_bytes: file.size
    )

    # 2. Пытаемся "забрать" задачу (меняем статус на "processing")
    unless prediction.claim!
      prediction.fail!(error_code: "CLAIM_FAILED", error_message: "Не удалось начать обработку")
      return render json: { error: "Не удалось начать обработку" }, status: :internal_server_error
    end

    # 3. Отправляем файл в ML-сервис
    start_time = Time.current
    ml_response = call_ml_service(file)
    processing_duration = ((Time.current - start_time) * 1000).round

    if ml_response[:status] == "success"
      # 4. Находим WeatherCondition по коду (ML возвращает "rain", нам нужно "RAIN")
      weather_code = ml_response[:prediction][:class].upcase
      weather_condition = WeatherCondition.active.find_by(code: weather_code)

      # 5. Завершаем обработку
      prediction.complete!(
        weather_condition: weather_condition,
        confidence: ml_response[:prediction][:confidence],
        class_probabilities: { weather_code => ml_response[:prediction][:confidence] },
        processing_duration_ms: processing_duration,
        ml_model_version: "mock-v1",
        ml_service_version: "mock-v1"
      )

      # 6. Получаем название на русском (или другом языке пользователя)
      locale = current_user.locale || "ru"
      condition_name = weather_condition&.translated(locale)&.name || weather_code

      render json: {
        status: "success",
        prediction: {
          id: prediction.id,
          public_id: prediction.public_id,
          status: prediction.status,
          weather_condition: condition_name,
          weather_code: weather_code,
          confidence: prediction.confidence,
          created_at: prediction.created_at
        }
      }, status: :created
    else
      # 7. Обрабатываем ошибку ML-сервиса
      prediction.fail!(
        error_code: "ML_SERVICE_ERROR",
        error_message: ml_response[:message] || "Неизвестная ошибка ML-сервиса"
      )
      render json: { error: "Ошибка ML-сервиса", details: ml_response }, status: :internal_server_error
    end
  end

  # GET /predictions
  def index
    predictions = current_user.predictions.completed.recent.limit(10).includes(:weather_condition)
    locale = current_user.locale || "ru"
    
    render json: {
      predictions: predictions.map do |p|
        condition_name = p.weather_condition&.translated(locale)&.name || p.weather_condition&.code || "UNKNOWN"
        
        {
          id: p.id,
          public_id: p.public_id,
          status: p.status,
          weather_condition: condition_name,
          weather_code: p.weather_condition&.code,
          confidence: p.confidence,
          created_at: p.created_at
        }
      end
    }
  end

  private

  def call_ml_service(file)
    require 'net/http'
    require 'uri'

    uri = URI('http://localhost:8000/predict')
    
    boundary = "----RubyFormBoundary#{SecureRandom.hex(10)}"
    
    body = []
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{file.original_filename}\"\r\n"
    body << "Content-Type: #{file.content_type}\r\n\r\n"
    body << file.read
    body << "\r\n--#{boundary}--\r\n"
    
    body = body.join

    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri.path)
    request['Content-Type'] = "multipart/form-data; boundary=#{boundary}"
    request.body = body

    response = http.request(request)
    
    JSON.parse(response.body, symbolize_names: true)
  rescue => e
    { status: "error", message: e.message }
  end
end