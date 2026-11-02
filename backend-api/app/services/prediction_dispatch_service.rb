# Persists an attempt before talking to Redis. If Rails stops between the
# database commit and the Redis push (or after the push but before the
# confirmation update), the recovery job safely tries again later.
class PredictionDispatchService
  RETRY_AFTER = 45.seconds

  def self.call(dispatch_id)
    prediction_id = reserve_attempt(dispatch_id)
    return false unless prediction_id

    job = AnalyzePredictionJob.perform_later(prediction_id)
    unless job && job.respond_to?(:successfully_enqueued?) && job.successfully_enqueued?
      raise "Active Job did not enqueue prediction_id=#{prediction_id}"
    end

    updated = PredictionDispatch.where(id: dispatch_id, dispatched_at: nil).update_all(
      dispatched_at: Time.current,
      last_error: nil,
      updated_at: Time.current
    )

    updated == 1
  rescue StandardError => error
    PredictionDispatch.where(id: dispatch_id, dispatched_at: nil).update_all(
      last_error: "#{error.class}: #{error.message}".truncate(2_000),
      updated_at: Time.current
    )

    Rails.logger.error(
      "[PredictionDispatchService] dispatch_id=#{dispatch_id} " \
      "#{error.class}: #{error.message}"
    )
    false
  end

  def self.reserve_attempt(dispatch_id)
    PredictionDispatch.transaction do
      dispatch = PredictionDispatch.lock.find_by(id: dispatch_id)
      next if dispatch.nil? || dispatch.dispatched_at.present?

      now = Time.current
      next if dispatch.last_attempt_at.present? &&
              dispatch.last_attempt_at > now - RETRY_AFTER

      dispatch.update!(
        last_attempt_at: now,
        attempt_count: dispatch.attempt_count + 1,
        last_error: nil
      )

      dispatch.prediction_id
    end
  end

  private_class_method :reserve_attempt
end
