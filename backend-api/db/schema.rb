# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_18_161820) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "auth_tokens", force: :cascade do |t|
    t.timestamptz "created_at", null: false
    t.jsonb "device_info"
    t.timestamptz "expires_at"
    t.inet "ip_address"
    t.string "kind", null: false
    t.timestamptz "last_used_at"
    t.string "name"
    t.timestamptz "revoked_at"
    t.jsonb "scopes", default: [], null: false
    t.string "token_digest", null: false
    t.string "token_prefix", null: false
    t.timestamptz "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["kind", "expires_at"], name: "index_auth_tokens_on_kind_and_expires_at"
    t.index ["token_digest"], name: "index_auth_tokens_on_token_digest", unique: true
    t.index ["token_prefix"], name: "index_auth_tokens_on_token_prefix"
    t.index ["user_id", "revoked_at"], name: "idx_auth_tokens_active_for_user", where: "(revoked_at IS NULL)"
    t.index ["user_id"], name: "index_auth_tokens_on_user_id"
    t.check_constraint "kind::text = ANY (ARRAY['api_key'::character varying, 'session'::character varying]::text[])", name: "auth_tokens_kind_check"
  end

  create_table "demo_example_translations", force: :cascade do |t|
    t.timestamptz "created_at", null: false
    t.bigint "demo_example_id", null: false
    t.text "description"
    t.string "locale", null: false
    t.string "title", null: false
    t.timestamptz "updated_at", null: false
    t.index ["demo_example_id", "locale"], name: "index_demo_example_translations_on_demo_example_id_and_locale", unique: true
    t.index ["demo_example_id"], name: "index_demo_example_translations_on_demo_example_id"
  end

  create_table "demo_examples", force: :cascade do |t|
    t.timestamptz "created_at", null: false
    t.timestamptz "deleted_at"
    t.integer "display_order", default: 0, null: false
    t.integer "lock_version", default: 0, null: false
    t.jsonb "metadata", default: {}, null: false
    t.string "storage_key", null: false
    t.timestamptz "updated_at", null: false
    t.bigint "weather_condition_id", null: false
    t.index ["weather_condition_id", "display_order"], name: "index_demo_examples_on_weather_condition_id_and_display_order"
    t.index ["weather_condition_id"], name: "index_demo_examples_on_weather_condition_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.timestamptz "created_at", null: false
    t.bigint "prediction_id", null: false
    t.bigint "user_id", null: false
    t.index ["prediction_id"], name: "index_favorites_on_prediction_id"
    t.index ["user_id", "prediction_id"], name: "index_favorites_on_user_id_and_prediction_id", unique: true
    t.index ["user_id"], name: "index_favorites_on_user_id"
  end

  create_table "feedbacks", force: :cascade do |t|
    t.bigint "actual_condition_id"
    t.jsonb "attachments", default: [], null: false
    t.text "comment"
    t.timestamptz "created_at", null: false
    t.timestamptz "deleted_at"
    t.string "feedback_type", null: false
    t.integer "lock_version", default: 0, null: false
    t.bigint "prediction_id", null: false
    t.text "resolution_note"
    t.timestamptz "reviewed_at"
    t.bigint "reviewer_id"
    t.string "severity", default: "normal", null: false
    t.string "status", default: "new", null: false
    t.timestamptz "updated_at", null: false
    t.bigint "user_id"
    t.index ["actual_condition_id"], name: "index_feedbacks_on_actual_condition_id"
    t.index ["feedback_type"], name: "index_feedbacks_on_feedback_type"
    t.index ["prediction_id"], name: "index_feedbacks_on_prediction_id"
    t.index ["reviewer_id"], name: "index_feedbacks_on_reviewer_id"
    t.index ["severity"], name: "index_feedbacks_on_severity"
    t.index ["status", "created_at"], name: "idx_feedbacks_status_recent", order: { created_at: :desc }
    t.index ["user_id"], name: "index_feedbacks_on_user_id"
    t.check_constraint "feedback_type::text = ANY (ARRAY['wrong_class'::character varying, 'bad_heatmap'::character varying, 'slow'::character varying, 'ui_issue'::character varying, 'other'::character varying]::text[])", name: "feedbacks_type_check"
    t.check_constraint "severity::text = ANY (ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying]::text[])", name: "feedbacks_severity_check"
    t.check_constraint "status::text = ANY (ARRAY['new'::character varying, 'triaged'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'wont_fix'::character varying, 'duplicate'::character varying]::text[])", name: "feedbacks_status_check"
  end

  create_table "predictions", force: :cascade do |t|
    t.jsonb "class_probabilities", default: {}, null: false
    t.float "confidence"
    t.timestamptz "created_at", null: false
    t.timestamptz "deleted_at"
    t.string "error_code"
    t.text "error_message"
    t.text "explanation_text"
    t.timestamptz "finished_at"
    t.string "heatmap_storage_key"
    t.string "idempotency_key"
    t.string "image_checksum"
    t.timestamptz "image_deleted_at"
    t.integer "image_height"
    t.bigint "image_size_bytes"
    t.integer "image_width"
    t.boolean "is_demo", default: false, null: false
    t.string "ml_model_version"
    t.string "ml_service_version"
    t.string "original_filename"
    t.timestamptz "processed_at"
    t.integer "processing_duration_ms"
    t.uuid "public_id", default: -> { "gen_random_uuid()" }, null: false
    t.integer "retry_count", default: 0, null: false
    t.timestamptz "started_at"
    t.string "status", default: "pending", null: false
    t.string "storage_key"
    t.timestamptz "updated_at", null: false
    t.bigint "user_id", null: false
    t.jsonb "validation_errors", default: [], null: false
    t.string "validation_status"
    t.bigint "weather_condition_id"
    t.index ["public_id"], name: "index_predictions_on_public_id", unique: true
    t.index ["status", "created_at"], name: "idx_predictions_status_recent", order: { created_at: :desc }
    t.index ["user_id", "created_at"], name: "idx_predictions_user_recent", order: { created_at: :desc }
    t.index ["user_id", "idempotency_key"], name: "uniq_predictions_user_idempotency_key", unique: true, where: "(idempotency_key IS NOT NULL)"
    t.index ["user_id", "image_checksum"], name: "uniq_predictions_user_checksum", unique: true, where: "((deleted_at IS NULL) AND (image_checksum IS NOT NULL))"
    t.index ["user_id"], name: "index_predictions_on_user_id"
    t.index ["weather_condition_id", "created_at"], name: "idx_predictions_condition_recent", order: { created_at: :desc }
    t.index ["weather_condition_id"], name: "index_predictions_on_weather_condition_id"
    t.check_constraint "confidence IS NULL OR confidence >= 0::double precision AND confidence <= 1::double precision", name: "predictions_confidence_range"
    t.check_constraint "status::text <> 'completed'::text OR confidence IS NOT NULL", name: "predictions_completed_requires_confidence"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])", name: "predictions_status_check"
    t.check_constraint "validation_status IS NULL OR (validation_status::text = ANY (ARRAY['ok'::character varying, 'warning'::character varying, 'error'::character varying]::text[]))", name: "predictions_validation_status_check"
  end

  create_table "users", force: :cascade do |t|
    t.timestamptz "anonymized_at"
    t.datetime "created_at", null: false
    t.timestamptz "deleted_at"
    t.string "email"
    t.integer "failed_login_count", default: 0, null: false
    t.timestamptz "last_active_at"
    t.timestamptz "last_sign_in_at"
    t.string "locale"
    t.integer "lock_version", default: 0, null: false
    t.timestamptz "locked_until"
    t.string "name"
    t.string "password_digest"
    t.uuid "public_id", default: -> { "gen_random_uuid()" }, null: false
    t.string "role", default: "user", null: false
    t.jsonb "settings", default: {}, null: false
    t.integer "sign_in_count", default: 0, null: false
    t.string "timezone"
    t.datetime "updated_at", null: false
    t.index ["anonymized_at"], name: "idx_users_anonymized", where: "(anonymized_at IS NOT NULL)"
    t.index ["deleted_at"], name: "idx_users_active", where: "(deleted_at IS NULL)"
    t.index ["email"], name: "idx_users_email_unique", unique: true, where: "(email IS NOT NULL)"
    t.index ["last_active_at"], name: "index_users_on_last_active_at"
    t.index ["public_id"], name: "index_users_on_public_id", unique: true
    t.index ["role"], name: "index_users_on_role"
    t.check_constraint "anonymized_at IS NULL OR email IS NULL AND name IS NULL AND password_digest IS NULL", name: "users_anonymized_no_pii"
    t.check_constraint "role::text = ANY (ARRAY['user'::character varying, 'admin'::character varying]::text[])", name: "users_role_check"
  end

  create_table "weather_condition_translations", force: :cascade do |t|
    t.timestamptz "created_at", null: false
    t.text "description"
    t.text "driver_recommendation"
    t.string "locale", null: false
    t.string "name", null: false
    t.timestamptz "updated_at", null: false
    t.bigint "weather_condition_id", null: false
    t.index ["weather_condition_id", "locale"], name: "idx_on_weather_condition_id_locale_8a54ac9dc3", unique: true
    t.index ["weather_condition_id"], name: "index_weather_condition_translations_on_weather_condition_id"
  end

  create_table "weather_conditions", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "code", null: false
    t.timestamptz "created_at", null: false
    t.timestamptz "deleted_at"
    t.integer "display_order", default: 0, null: false
    t.integer "lock_version", default: 0, null: false
    t.jsonb "metadata", default: {}, null: false
    t.float "min_confidence", default: 0.5, null: false
    t.timestamptz "updated_at", null: false
    t.index ["active"], name: "idx_weather_conditions_active", where: "active"
    t.index ["code"], name: "index_weather_conditions_on_code", unique: true
    t.check_constraint "code::text ~ '^[A-Z_]+$'::text", name: "weather_conditions_code_format"
    t.check_constraint "min_confidence >= 0::double precision AND min_confidence <= 1::double precision", name: "weather_conditions_min_confidence_range"
  end

  add_foreign_key "auth_tokens", "users", on_delete: :cascade
  add_foreign_key "demo_example_translations", "demo_examples", on_delete: :cascade
  add_foreign_key "demo_examples", "weather_conditions", on_delete: :restrict
  add_foreign_key "favorites", "predictions", on_delete: :cascade
  add_foreign_key "favorites", "users", on_delete: :cascade
  add_foreign_key "feedbacks", "predictions", on_delete: :cascade
  add_foreign_key "feedbacks", "users", column: "reviewer_id", on_delete: :nullify
  add_foreign_key "feedbacks", "users", on_delete: :nullify
  add_foreign_key "feedbacks", "weather_conditions", column: "actual_condition_id", on_delete: :nullify
  add_foreign_key "predictions", "users", on_delete: :cascade
  add_foreign_key "predictions", "weather_conditions", on_delete: :restrict
  add_foreign_key "weather_condition_translations", "weather_conditions", on_delete: :cascade
end
