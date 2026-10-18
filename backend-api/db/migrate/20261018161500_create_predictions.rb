class CreatePredictions < ActiveRecord::Migration[8.1]
  def change
    create_table :predictions do |t|
      t.uuid        :public_id, null: false, default: -> { "gen_random_uuid()" }
      t.references  :user, null: false, foreign_key: { on_delete: :cascade }
      t.references  :weather_condition, foreign_key: { on_delete: :restrict }

      t.string      :status, null: false, default: "pending"
      t.boolean     :is_demo, null: false, default: false

      t.string      :storage_key
      t.string      :original_filename
      t.string      :image_checksum
      t.bigint      :image_size_bytes
      t.integer     :image_width
      t.integer     :image_height

      t.float       :confidence
      t.jsonb       :class_probabilities, null: false, default: {}
      t.text        :explanation_text
      t.string      :heatmap_storage_key

      t.integer     :processing_duration_ms
      t.string      :ml_model_version
      t.string      :ml_service_version

      t.string      :validation_status
      t.jsonb       :validation_errors, null: false, default: []
      t.string      :error_code
      t.text        :error_message
      t.integer     :retry_count, null: false, default: 0

      t.string      :idempotency_key

      t.timestamptz :started_at
      t.timestamptz :processed_at
      t.timestamptz :finished_at
      t.timestamptz :image_deleted_at
      t.timestamptz :deleted_at
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end

    add_index :predictions, :public_id, unique: true
    add_index :predictions, [:user_id, :created_at], order: { created_at: :desc }, name: "idx_predictions_user_recent"
    add_index :predictions, [:weather_condition_id, :created_at], order: { created_at: :desc }, name: "idx_predictions_condition_recent"
    add_index :predictions, [:status, :created_at], order: { created_at: :desc }, name: "idx_predictions_status_recent"

    add_index :predictions, [:user_id, :image_checksum], unique: true,
              where: "deleted_at IS NULL AND image_checksum IS NOT NULL",
              name: "uniq_predictions_user_checksum"

    add_index :predictions, [:user_id, :idempotency_key], unique: true,
              where: "idempotency_key IS NOT NULL",
              name: "uniq_predictions_user_idempotency_key"

    add_check_constraint :predictions, "status IN ('pending','processing','completed','failed','cancelled')", name: "predictions_status_check"
    add_check_constraint :predictions, "validation_status IS NULL OR validation_status IN ('ok','warning','error')", name: "predictions_validation_status_check"
    add_check_constraint :predictions, "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name: "predictions_confidence_range"
    add_check_constraint :predictions, "status <> 'completed' OR confidence IS NOT NULL", name: "predictions_completed_requires_confidence"
  end
end