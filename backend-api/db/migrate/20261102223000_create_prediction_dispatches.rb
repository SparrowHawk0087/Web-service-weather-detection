class CreatePredictionDispatches < ActiveRecord::Migration[8.1]
  def change
    create_table :prediction_dispatches do |t|
      t.references :prediction,
                   null: false,
                   index: { unique: true },
                   foreign_key: { on_delete: :cascade }
      t.integer :attempt_count, null: false, default: 0
      t.datetime :last_attempt_at
      t.datetime :dispatched_at
      t.text :last_error

      t.timestamps
      t.index :last_attempt_at,
              where: "dispatched_at IS NULL",
              name: "index_prediction_dispatches_for_recovery"
    end
  end
end
