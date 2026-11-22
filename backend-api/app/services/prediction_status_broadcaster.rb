class PredictionStatusBroadcaster
  def self.broadcast(prediction)
    prediction.reload
    user = prediction.user

    payload = PredictionSerializer.new(
      prediction,
      locale: user.locale.presence || "ru"
    ).as_json

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
