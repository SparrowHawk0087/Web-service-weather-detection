class UpgradeUsersForPhase1 < ActiveRecord::Migration[8.1]
  def up
    remove_index :users, :email, if_exists: true
    remove_column :users, :email_confirmed_at, if_exists: true

    change_table :users, bulk: true do |t|
      t.uuid        :public_id, null: false, default: -> { "gen_random_uuid()" }
      t.string      :role, null: false, default: "user"
      t.jsonb       :settings, null: false, default: {}
      t.string      :locale
      t.string      :timezone
      t.integer     :failed_login_count, null: false, default: 0
      t.integer     :sign_in_count, null: false, default: 0
      t.timestamptz :locked_until
      t.timestamptz :last_sign_in_at
      t.timestamptz :last_active_at
      t.timestamptz :anonymized_at
      t.timestamptz :deleted_at
      t.integer     :lock_version, null: false, default: 0
    end

    change_column_null :users, :email, true
    change_column_null :users, :name, true
    change_column_null :users, :password_digest, true

    add_index :users, :public_id, unique: true
    add_index :users, :email, unique: true, where: "email IS NOT NULL", name: "idx_users_email_unique"
    add_index :users, :role
    add_index :users, :last_active_at
    add_index :users, :deleted_at, where: "deleted_at IS NULL", name: "idx_users_active"
    add_index :users, :anonymized_at, where: "anonymized_at IS NOT NULL", name: "idx_users_anonymized"

    # user / admin
    add_check_constraint :users, "role IN ('user','admin')", name: "users_role_check"

    add_check_constraint :users,
      "anonymized_at IS NULL OR (email IS NULL AND name IS NULL AND password_digest IS NULL)",
      name: "users_anonymized_no_pii"
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end