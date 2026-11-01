class PredictionStatusBroadcaster
  def self.broadcast(prediction)
    prediction.reload

    user = prediction.user
    locale = user.locale.presence || "ru"
    condition = prediction.weather_condition
    top_probability_class = prediction.class_probabilities&.max_by { |_key, value| value }&.first

    payload = {
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
      finished_at: prediction.finished_at,
      updated_at: prediction.updated_at
    }

    ActionCable.server.broadcast(
      stream_name(prediction.user_id),
      { type: "prediction.updated", prediction: payload }
    )
  rescue StandardError => error
    # Real-time delivery must never break the background classification job.
    Rails.logger.warn(
      "[PredictionStatusBroadcaster] prediction_id=#{prediction&.id} " \
      "#{error.class}: #{error.message}"
    )
    false
  end

  def self.stream_name(user_id)
    "predictions:user:#{user_id}"
  end
  private_class_method :stream_name
end
