class AnalyzePredictionJob < ApplicationJob
  queue_as :default

  retry_on MlService::WeatherPredictionClient::TransientError,
           wait: 5.seconds,
           attempts: 4 do |job, error|
    prediction = Prediction.find_by(id: job.arguments.first)
    prediction&.fail!(
      error_code: error.error_code,
      error_message: error.message.truncate(1_000)
    )
  end

  def perform(prediction_id)
    prediction = Prediction.find_by(id: prediction_id)
    return unless prediction
    return unless prediction.claim!

    started_at = prediction.started_at || Time.current

    result = MlService::WeatherPredictionClient.new.call(
      storage_key: prediction.storage_key,
      original_filename: prediction.original_filename,
      model_id: prediction.ml_model_version.presence || "vision-v1"
    )

    validated_result = PredictionResultContract.new(result).call

    prediction.complete!(
      weather_condition: validated_result.fetch(:weather_condition),
      confidence: validated_result.fetch(:confidence),
      class_probabilities: validated_result.fetch(:probabilities),
      ml_service_version: result[:model_used].presence || result["model_used"].presence || "unknown",
      processing_duration_ms: ((Time.current - started_at) * 1_000).round
    )
  rescue PredictionResultContract::InvalidResult => error
    prediction&.fail!(
      error_code: error.error_code,
      error_message: error.message.truncate(1_000)
    )
  rescue MlService::WeatherPredictionClient::TransientError
    prediction&.update!(
      status: "pending",
      started_at: nil,
      retry_count: prediction.retry_count + 1
    )
    PredictionStatusBroadcaster.broadcast(prediction) if prediction
    raise
  rescue MlService::WeatherPredictionClient::RejectedFileError => error
    prediction&.fail!(
      error_code: error.error_code,
      error_message: error.message.truncate(1_000)
    )
  rescue StandardError => error
    Rails.logger.error(
      "[AnalyzePredictionJob] prediction_id=#{prediction_id} " \
      "#{error.class}: #{error.message}"
    )
    prediction&.fail!(
      error_code: "PROCESSING_ERROR",
      error_message: error.message.truncate(1_000)
    )
  end
end
