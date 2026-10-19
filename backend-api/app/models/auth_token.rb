class AuthToken < ApplicationRecord
  KINDS          = %w[api_key session].freeze
  PREFIX_VISIBLE = 16

  belongs_to :user

  validates :kind,         inclusion: { in: KINDS }
  validates :token_digest, presence: true, uniqueness: true
  validates :token_prefix, presence: true

  scope :active, -> {
    where(revoked_at: nil).where("expires_at IS NULL OR expires_at > ?", Time.current)
  }

  def self.issue(user:, kind: "api_key", name: nil, expires_at: nil)
    raw = generate_raw(kind)
    token = create!(
      user:         user,
      kind:         kind,
      name:         name,
      expires_at:   expires_at,
      token_prefix: raw[0, PREFIX_VISIBLE],
      token_digest: Digest::SHA256.hexdigest(raw)
    )
    [token, raw]
  end

  def self.authenticate(raw)
    return nil if raw.blank?
    token = find_by(token_digest: Digest::SHA256.hexdigest(raw))
    return nil unless token&.active?
    token.touch_last_used!
    token
  end

  def self.generate_raw(kind)
    prefix = kind == "api_key" ? "wth_live_" : "wth_sess_"
    prefix + SecureRandom.urlsafe_base64(32)
  end
  private_class_method :generate_raw

  def active?
    revoked_at.nil? && (expires_at.nil? || expires_at > Time.current)
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def touch_last_used!
    update_column(:last_used_at, Time.current)
  end
end