class CreateWeatherConditions < ActiveRecord::Migration[8.1]
  def change
    create_table :weather_conditions do |t|
      t.string      :code, null: false
      t.float       :min_confidence, null: false, default: 0.5
      t.boolean     :active, null: false, default: true
      t.integer     :display_order, null: false, default: 0
      t.jsonb       :metadata, null: false, default: {}
      t.timestamptz :deleted_at
      t.integer     :lock_version, null: false, default: 0
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end

    add_index :weather_conditions, :code, unique: true
    add_index :weather_conditions, :active, where: "active", name: "idx_weather_conditions_active"

    add_check_constraint :weather_conditions, "code ~ '^[A-Z_]+$'", name: "weather_conditions_code_format"
    add_check_constraint :weather_conditions, "min_confidence >= 0 AND min_confidence <= 1", name: "weather_conditions_min_confidence_range"

    create_table :weather_condition_translations do |t|
      t.references  :weather_condition, null: false, foreign_key: { on_delete: :cascade }
      t.string      :locale, null: false
      t.string      :name, null: false
      t.text        :description
      t.text        :driver_recommendation
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end
    add_index :weather_condition_translations, [:weather_condition_id, :locale], unique: true
  end
end