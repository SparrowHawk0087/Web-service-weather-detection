class CreateFeedbacks < ActiveRecord::Migration[8.1]
  def change
    create_table :feedbacks do |t|
      t.references  :prediction, null: false, foreign_key: { on_delete: :cascade }
      t.references  :user, foreign_key: { on_delete: :nullify }
      t.references  :actual_condition, foreign_key: { to_table: :weather_conditions, on_delete: :nullify }

      t.string      :feedback_type, null: false
      t.string      :severity, null: false, default: "normal"
      t.text        :comment
      t.jsonb       :attachments, null: false, default: []

      t.string      :status, null: false, default: "new"
      t.text        :resolution_note
      t.references  :reviewer, foreign_key: { to_table: :users, on_delete: :nullify }
      t.timestamptz :reviewed_at

      t.timestamptz :deleted_at
      t.integer     :lock_version, null: false, default: 0
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end

    add_index :feedbacks, [:status, :created_at], order: { created_at: :desc }, name: "idx_feedbacks_status_recent"
    add_index :feedbacks, :feedback_type
    add_index :feedbacks, :severity

    add_check_constraint :feedbacks, "feedback_type IN ('wrong_class','bad_heatmap','slow','ui_issue','other')", name: "feedbacks_type_check"
    add_check_constraint :feedbacks, "severity IN ('low','normal','high','critical')", name: "feedbacks_severity_check"
    add_check_constraint :feedbacks, "status IN ('new','triaged','in_progress','resolved','wont_fix','duplicate')", name: "feedbacks_status_check"
  end
end