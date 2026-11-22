class PredictionHistoryCleanupService
  class CleanupEnqueueFailed < StandardError; end

  def initialize(user)
    @user = user
  end

  def call
    deleted_count = 0

    user.with_lock do
      now = Time.current
      scope = user.predictions.where(deleted_at: nil)
      prediction_ids = scope.pluck(:id)
      deleted_count = prediction_ids.size

      Prediction.transaction do
        scope.where(status: %w[pending processing]).update_all(
          status: "cancelled",
          finished_at: now,
          updated_at: now
        )

        Favorite.where(prediction_id: prediction_ids).delete_all
        Feedback.where(prediction_id: prediction_ids).delete_all
        PredictionDispatch.where(prediction_id: prediction_ids).delete_all

        scope.update_all(deleted_at: now, updated_at: now)
      end
    end

    enqueue_pending_media_cleanup
    { deleted_count: deleted_count }
  end

  private

  attr_reader :user

  def enqueue_pending_media_cleanup
    pending_ids = user.predictions
                      .where.not(deleted_at: nil)
                      .where("storage_key IS NOT NULL OR heatmap_storage_key IS NOT NULL")
                      .ids
    return if pending_ids.empty?

    DeletePredictionMediaJob.perform_later(pending_ids)
  rescue StandardError => error
    Rails.logger.error(
      "[PredictionHistoryCleanupService] could not enqueue media cleanup "       "user_id=#{user.id} #{error.class}: #{error.message}"
    )
    raise CleanupEnqueueFailed, "Prediction media cleanup could not be scheduled"
  end
end
