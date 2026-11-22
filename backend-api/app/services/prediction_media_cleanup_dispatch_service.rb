# Uses PostgreSQL as a durable cleanup outbox. If Redis is unavailable,
# the recovery scheduler can retry rows whose enqueue lease has expired.
class PredictionMediaCleanupDispatchService
  BATCH_SIZE = 100
  RETRY_AFTER = 10.minutes

  def self.call(prediction_ids = nil)
    return 0 if !prediction_ids.nil? && Array(prediction_ids).empty?

    candidates = pending_scope(prediction_ids)
                  .order(:id)
                  .limit(BATCH_SIZE)
                  .pluck(:id)
    return 0 if candidates.empty?

    reserved_ids = reserve(candidates)
    return 0 if reserved_ids.empty?

    job = DeletePredictionMediaJob.perform_later(reserved_ids)
    unless job && job.respond_to?(:successfully_enqueued?) && job.successfully_enqueued?
      raise "Active Job did not enqueue prediction media cleanup"
    end

    reserved_ids.length
  rescue StandardError
    Prediction.where(id: reserved_ids || [])
              .update_all(media_cleanup_requested_at: nil, updated_at: Time.current)
    raise
  end

  def self.pending_scope(prediction_ids = nil)
    scope = Prediction.where.not(deleted_at: nil)
                      .where("storage_key IS NOT NULL OR heatmap_storage_key IS NOT NULL")
                      .where(
                        "media_cleanup_requested_at IS NULL OR media_cleanup_requested_at <= ?",
                        RETRY_AFTER.ago
                      )
    scope = scope.where(id: Array(prediction_ids)) unless prediction_ids.nil?
    scope
  end
  private_class_method :pending_scope

  def self.reserve(candidate_ids)
    reserved_ids = []

    candidate_ids.each do |prediction_id|
      Prediction.transaction do
        prediction = Prediction.lock.find_by(id: prediction_id)
        next unless prediction && prediction.deleted_at.present?
        next if prediction.storage_key.blank? && prediction.heatmap_storage_key.blank?
        next if prediction.media_cleanup_requested_at.present? &&
                prediction.media_cleanup_requested_at > RETRY_AFTER.ago

        prediction.update_columns(
          media_cleanup_requested_at: Time.current,
          updated_at: Time.current
        )
        reserved_ids << prediction.id
      end
    end

    reserved_ids
  end
  private_class_method :reserve
end
