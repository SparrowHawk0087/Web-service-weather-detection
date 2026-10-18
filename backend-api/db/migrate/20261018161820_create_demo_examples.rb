class CreateDemoExamples < ActiveRecord::Migration[8.1]
  def change
    create_table :demo_examples do |t|
      t.string      :storage_key, null: false
      t.references  :weather_condition, null: false, foreign_key: { on_delete: :restrict }
      t.integer     :display_order, null: false, default: 0
      t.jsonb       :metadata, null: false, default: {}
      t.timestamptz :deleted_at
      t.integer     :lock_version, null: false, default: 0
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end
    add_index :demo_examples, [:weather_condition_id, :display_order]

    create_table :demo_example_translations do |t|
      t.references  :demo_example, null: false, foreign_key: { on_delete: :cascade }
      t.string      :locale, null: false
      t.string      :title, null: false
      t.text        :description
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end
    add_index :demo_example_translations, [:demo_example_id, :locale], unique: true
  end
end