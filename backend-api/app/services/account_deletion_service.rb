class AccountDeletionService
  class CleanupEnqueueFailed < StandardError; end

  def initialize(user)
    @user = user
  end

  def call
    user.anonymize!
    enqueue_pending_media_cleanup
    true
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
      "[AccountDeletionService] could not enqueue media cleanup "       "user_id=#{user.id} #{error.class}: #{error.message}"
    )
    raise CleanupEnqueueFailed, "Prediction media cleanup could not be scheduled"
  end
end
