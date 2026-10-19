class CreateFavorites < ActiveRecord::Migration[8.1]
  def change
    create_table :favorites do |t|
      t.references  :user, null: false, foreign_key: { on_delete: :cascade }
      t.references  :prediction, null: false, foreign_key: { on_delete: :cascade }
      t.timestamptz :created_at, null: false
    end
    add_index :favorites, [:user_id, :prediction_id], unique: true
  end
end
