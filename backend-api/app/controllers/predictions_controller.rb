class PredictionsController < ApplicationController
  # Добавляем новые экшены в фильтр авторизации
  before_action :authenticate_request, only: [:create, :index, :analyze, :update, :destroy]

  # POST /predictions/analyze
  # Только анализируем картинку (или архив), НЕ сохраняем в БД
  def analyze
    unless params[:file].present?
      return render json: { error: "Файл не передан" }, status: :bad_request
    end

    # Получаем ID модели (по умолчанию vision-v1, если не передан)
    model_id = params[:model_id] || "vision-v1"
    
    # Передаем файл и ID модели в ML-сервис
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
          confidence: ml_response[:prediction][:confidence]
        }
      }
    else
      render json: { error: "Ошибка ML-сервиса", details: ml_response }, status: :internal_server_error
    end
  end

  # POST /predictions
  # Сохраняем результат, который пришел с фронтенда
  def create
    weather_code = params[:weather_code]
    weather_condition = WeatherCondition.active.find_by(code: weather_code)

    prediction = current_user.predictions.new(
      name: params[:name], # Название, введенное пользователем в модалке
      status: "completed", # Сразу ставим completed, так как анализ уже прошел
      weather_condition: weather_condition,
      confidence: params[:confidence],
      class_probabilities: { weather_code => params[:confidence] },
      ml_model_version: "mock-v1",
      ml_service_version: "mock-v1"
    )

    # Заглушка для файла, так как Active Storage пока не настроен
    if params[:image].present?
      file = params[:image]
      prediction.storage_key = "temp_#{SecureRandom.hex(8)}"
      prediction.original_filename = file.original_filename
      prediction.image_size_bytes = file.size
    end

    if prediction.save
      locale = current_user.locale || "ru"
      condition_name = weather_condition&.translated(locale)&.name || weather_code

      render json: {
        status: "success",
        prediction: {
          id: prediction.id,
          public_id: prediction.public_id,
          name: prediction.name,
          status: prediction.status,
          weather_condition: condition_name,
          weather_code: weather_code,
          confidence: prediction.confidence,
          created_at: prediction.created_at
        }
      }, status: :created
    else
      render json: { error: prediction.errors.full_messages }, status: :unprocessable_entity
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
          name: p.name,
          status: p.status,
          weather_condition: condition_name,
          weather_code: p.weather_condition&.code,
          confidence: p.confidence,
          created_at: p.created_at
        }
      end
    }
  end

  # PATCH/PUT /predictions/:id
  # Переименование записи
  def update
    prediction = current_user.predictions.find(params[:id])
    
    if prediction.update(name: params[:name])
      render json: { status: "success", name: prediction.name }
    else
      render json: { error: prediction.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /predictions/:id
  # Удаление записи
  def destroy
    prediction = current_user.predictions.find(params[:id])
    prediction.destroy
    head :no_content
  end

  private

  # Обновленный метод для отправки в FastAPI
  def call_ml_service(file, model_id)
    require 'net/http'
    require 'uri'

    uri = URI('http://localhost:8000/predict')
    
    boundary = "----RubyFormBoundary#{SecureRandom.hex(10)}"
    
    body = []
    
    # 1. Отправляем сам файл
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{file.original_filename}\"\r\n"
    body << "Content-Type: #{file.content_type}\r\n\r\n"
    body << file.read
    body << "\r\n"
    
    # 2. Отправляем ID модели
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"model_id\"\r\n\r\n"
    body << model_id.to_s
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