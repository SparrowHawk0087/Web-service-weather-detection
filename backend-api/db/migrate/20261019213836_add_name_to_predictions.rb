class AddNameToPredictions < ActiveRecord::Migration[8.1]
  def change
    add_column :predictions, :name, :string
  end
end
