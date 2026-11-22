class PredictionHistoryCleanupService
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

    schedule_media_cleanup
    { deleted_count: deleted_count }
  end

  private

  attr_reader :user

  def schedule_media_cleanup
    PredictionMediaCleanupDispatchService.call(user.predictions.where.not(deleted_at: nil).ids)
  rescue StandardError => error
    # The requested_at lease remains unset when enqueue fails. The dedicated
    # recovery process will discover these rows and retry when Redis recovers.
    Rails.logger.error(
      "[PredictionHistoryCleanupService] media cleanup enqueue failed " \
      "user_id=#{user.id} #{error.class}: #{error.message}"
    )
  end
end
