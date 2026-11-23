class DeletePredictionMediaJob < ApplicationJob
  queue_as :default

  retry_on PredictionImageStorage::StorageUnavailable,
           wait: :polynomially_longer,
           attempts: 10

  def perform(prediction_ids)
    Prediction.where(id: Array(prediction_ids))
              .where.not(deleted_at: nil)
              .find_each do |prediction|
      prediction.with_lock do
        next if prediction.deleted_at.nil?

        delete_media(prediction.storage_key)
        delete_media(prediction.heatmap_storage_key)

        prediction.update_columns(
          storage_key: nil,
          heatmap_storage_key: nil,
          image_deleted_at: Time.current,
          media_cleanup_requested_at: nil,
          updated_at: Time.current
        )
      end
    end
  end

  private

  def delete_media(storage_key)
    return if storage_key.blank?

    PredictionImageStorage.delete!(storage_key)
  rescue PredictionImageStorage::MissingImage
    Rails.logger.warn("[DeletePredictionMediaJob] invalid media key was skipped")
  end
end
