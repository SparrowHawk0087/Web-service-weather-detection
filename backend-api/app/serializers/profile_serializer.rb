class ProfileSerializer
  DEFAULT_SETTINGS = { "animations_enabled" => true }.freeze

  def initialize(user)
    @user = user
  end

  def as_json(*)
    settings = DEFAULT_SETTINGS.merge(
      user.settings.to_h.stringify_keys.slice(*DEFAULT_SETTINGS.keys)
    )

    {
      public_id: user.public_id,
      name: user.name,
      email: user.email,
      role: user.role,
      locale: user.locale,
      timezone: user.timezone,
      settings: settings,
      created_at: user.created_at&.utc&.iso8601(3),
      last_sign_in_at: user.last_sign_in_at&.utc&.iso8601(3)
    }
  end

  private

  attr_reader :user
end
