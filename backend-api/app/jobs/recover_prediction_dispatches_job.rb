class RecoverPredictionDispatchesJob < ApplicationJob
  queue_as :default

  BATCH_SIZE = 100

  def perform
    cutoff = PredictionDispatchService::RETRY_AFTER.ago
    dispatch_ids = PredictionDispatch.undispatched
                                     .where("last_attempt_at IS NULL OR last_attempt_at <= ?", cutoff)
                                     .order(:id)
                                     .limit(BATCH_SIZE)
                                     .pluck(:id)

    dispatch_ids.each do |dispatch_id|
      PredictionDispatchService.call(dispatch_id)
    end
  end
end
