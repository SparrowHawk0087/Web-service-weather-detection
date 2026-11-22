class AddMediaCleanupRequestedAtToPredictions < ActiveRecord::Migration[8.1]
  def change
    add_column :predictions, :media_cleanup_requested_at, :timestamptz

    add_index :predictions,
              [:media_cleanup_requested_at, :id],
              name: "idx_predictions_media_cleanup_recovery",
              where: "deleted_at IS NOT NULL AND (storage_key IS NOT NULL OR heatmap_storage_key IS NOT NULL)"
  end
end
