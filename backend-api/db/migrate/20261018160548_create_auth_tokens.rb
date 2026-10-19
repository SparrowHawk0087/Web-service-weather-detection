class CreateAuthTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :auth_tokens do |t|
      t.references  :user, null: false, foreign_key: { on_delete: :cascade }
      t.string      :kind, null: false
      t.string      :name
      t.string      :token_prefix, null: false
      t.string      :token_digest, null: false
      t.jsonb       :scopes, null: false, default: []
      t.jsonb       :device_info
      t.inet        :ip_address
      t.timestamptz :last_used_at
      t.timestamptz :expires_at
      t.timestamptz :revoked_at
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end

    add_index :auth_tokens, :token_digest, unique: true
    add_index :auth_tokens, :token_prefix
    add_index :auth_tokens, [:user_id, :revoked_at], where: "revoked_at IS NULL", name: "idx_auth_tokens_active_for_user"
    add_index :auth_tokens, [:kind, :expires_at]

    add_check_constraint :auth_tokens, "kind IN ('api_key','session')", name: "auth_tokens_kind_check"
  end
end