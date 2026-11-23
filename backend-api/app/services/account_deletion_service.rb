class AccountDeletionService
  def initialize(user)
    @user = user
  end

  def call
    user.anonymize!
    schedule_media_cleanup
    true
  end

  private

  attr_reader :user

  def schedule_media_cleanup
    PredictionMediaCleanupDispatchService.call(user.predictions.where.not(deleted_at: nil).ids)
  rescue StandardError => error
    # Account deletion is complete. Persisted media keys are a durable cleanup
    # request and will be picked up by the dispatch-recovery scheduler.
    Rails.logger.error(
      "[AccountDeletionService] media cleanup enqueue failed " \
      "user_id=#{user.id} #{error.class}: #{error.message}"
    )
  end
end
