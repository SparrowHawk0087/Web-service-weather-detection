class MigrateLegacyApiTokens < ActiveRecord::Migration[8.1]
  def up
    return unless column_exists?(:users, :api_token)

    User.reset_column_information
    User.where.not(api_token: [nil, ""]).find_each do |u|
      AuthToken.create!(
        user_id:      u.id,
        kind:         "api_key",
        name:         "legacy (migrated)",
        token_prefix: u.api_token[0, AuthToken::PREFIX_VISIBLE],
        token_digest: Digest::SHA256.hexdigest(u.api_token)
      )
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end