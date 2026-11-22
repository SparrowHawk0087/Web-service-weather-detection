class RecoverPredictionMediaCleanupJob < ApplicationJob
  queue_as :default

  def perform
    PredictionMediaCleanupDispatchService.call
  rescue StandardError => error
    Rails.logger.error(
      "[RecoverPredictionMediaCleanupJob] #{error.class}: #{error.message}"
    )
    raise
  end
end
