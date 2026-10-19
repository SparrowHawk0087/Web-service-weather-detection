class RemoveUsersApiTokenColumn < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :api_token, if_exists: true
  end
end