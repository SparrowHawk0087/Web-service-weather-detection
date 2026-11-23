class PredictionBulkDeletionService
  MAX_RECORDS = 100

  def initialize(user, prediction_ids)
    @user = user
    @prediction_ids = Array(prediction_ids).map(&:to_i).uniq
  end

  def call
    raise ArgumentError, "Invalid prediction IDs" if prediction_ids.empty? ||
                                                     prediction_ids.size > MAX_RECORDS ||
                                                     prediction_ids.any?(&:negative?) ||
                                                     prediction_ids.any?(&:zero?)

    deleted_count = 0

    user.with_lock do
      Prediction.transaction do
        scope = user.predictions.where(deleted_at: nil, id: prediction_ids)
        predictions = scope.lock.to_a
        raise ActiveRecord::RecordNotFound unless predictions.size == prediction_ids.size

        now = Time.current
        deleted_count = predictions.size

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

  attr_reader :user, :prediction_ids

  def schedule_media_cleanup
    PredictionMediaCleanupDispatchService.call(prediction_ids)
  rescue StandardError => error
    # The PostgreSQL cleanup outbox remains available to the recovery worker.
    Rails.logger.error(
      "[PredictionBulkDeletionService] cleanup enqueue failed " \
      "user_id=#{user.id} prediction_ids=#{prediction_ids.join(',')} " \
      "#{error.class}: #{error.message}"
    )
  end
end
