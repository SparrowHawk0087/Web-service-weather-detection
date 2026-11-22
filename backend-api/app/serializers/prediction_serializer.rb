require "time"

class PredictionSerializer
  IMAGE_CONTENT_TYPES = {
    ".jpg" => "image/jpeg",
    ".jpeg" => "image/jpeg",
    ".png" => "image/png",
    ".webp" => "image/webp",
    ".zip" => "application/zip"
  }.freeze

  def initialize(prediction, locale: I18n.locale)
    @prediction = prediction
    @locale = locale
  end

  def as_json(*)
    completed = prediction.status == "completed"
    probabilities = completed ? normalized_probabilities : {}
    weather_code = completed ? resolved_weather_code(probabilities) : nil

    {
      id: prediction.id,
      public_id: prediction.public_id,
      name: prediction.name,
      status: prediction.status,
      weather_code: weather_code,
      weather_condition: completed ? localized_condition(weather_code) : nil,
      confidence: completed ? prediction.confidence : nil,
      probabilities: probabilities,
      image_url: image_url,
      image_content_type: image_content_type,
      ml_model_version: prediction.ml_model_version,
      ml_service_version: prediction.ml_service_version,
      original_filename: safe_original_filename,
      processing_duration_ms: prediction.processing_duration_ms,
      error_code: prediction.error_code,
      created_at: iso8601_utc(prediction.created_at),
      finished_at: iso8601_utc(prediction.finished_at),
      updated_at: iso8601_utc(prediction.updated_at)
    }
  end

  alias call as_json

  private

  attr_reader :prediction, :locale

  def normalized_probabilities
    probabilities = prediction.class_probabilities
    return {} unless probabilities.respond_to?(:each_pair)

    probabilities.each_pair.each_with_object({}) do |(code, value), normalized|
      normalized[code.to_s.upcase] = value
    end
  end

  def resolved_weather_code(probabilities)
    condition_code = prediction.weather_condition&.code
    return condition_code.to_s.upcase if condition_code.present?

    probabilities.max_by { |_code, value| Float(value) rescue -Float::INFINITY }&.first
  end

  def localized_condition(weather_code)
    return nil if weather_code.blank?

    condition = prediction.weather_condition
    return weather_code unless condition && condition.code.to_s.casecmp?(weather_code)

    condition.translated(locale)&.name.presence || weather_code
  end

  def image_url
    storage_key = prediction.storage_key.to_s
    return nil if prediction.image_deleted_at.present?
    return nil unless storage_key.match?(/\A[0-9a-f-]{36}\.(jpg|jpeg|png|webp|zip)\z/i)

    "/predictions/#{prediction.id}/image"
  end

  def image_content_type
    return nil if image_url.nil?

    IMAGE_CONTENT_TYPES[File.extname(prediction.storage_key.to_s).downcase]
  end

  def safe_original_filename
    return nil if prediction.original_filename.blank?

    File.basename(prediction.original_filename.to_s)
  end

  def iso8601_utc(value)
    value&.utc&.iso8601(3)
  end
end
