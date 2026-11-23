class User < ApplicationRecord
  has_secure_password validations: false,
                      reset_token: { expires_in: 1.hour }

  ROLES             = %w[user admin].freeze
  MAX_FAILED_LOGINS = 10
  LOCK_DURATION     = 15.minutes

  normalizes :email, with: ->(e) { e.strip.downcase }, apply_to_nil: false

  has_many :auth_tokens,     dependent: :destroy
  has_many :predictions,     dependent: :destroy
  has_many :favorites,       dependent: :destroy
  has_many :feedbacks,       dependent: :nullify

  validates :role, inclusion: { in: ROLES }
  validates :name, presence: true,
                   length: { in: 3..50 },
                   unless: :anonymized?
  validates :email, presence: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP },
                    unless: :anonymized?
  validates :email, uniqueness: { case_sensitive: false },
                    unless: :anonymized?, allow_nil: true
  validates :password, presence: true, length: { minimum: 8 },
                       on: :create, unless: :anonymized?

  scope :active,     -> { where(deleted_at: nil, anonymized_at: nil) }
  scope :anonymized, -> { where.not(anonymized_at: nil) }

  def anonymized?
    anonymized_at.present?
  end

  def deleted?
    deleted_at.present?
  end

  def locked?
    locked_until.present? && locked_until > Time.current
  end

  def active?
    !deleted? && !anonymized? && !locked?
  end

  def admin?
    role == "admin"
  end

  def register_failed_login!
    with_lock do
      self.failed_login_count += 1
      self.locked_until = Time.current + LOCK_DURATION if failed_login_count >= MAX_FAILED_LOGINS
      save!
    end
    locked?
  end

  def register_successful_login!
    update!(
      failed_login_count: 0,
      locked_until: nil,
      sign_in_count: sign_in_count + 1,
      last_sign_in_at: Time.current,
      last_active_at: Time.current
    )
  end

  def unlock!
    update!(failed_login_count: 0, locked_until: nil)
  end

  def anonymize!
    transaction do
      now = Time.current
      all_prediction_ids = predictions.select(:id)
      active_predictions = predictions.where(deleted_at: nil)

      active_predictions.where(status: %w[pending processing]).update_all(
        status: "cancelled",
        finished_at: now,
        updated_at: now
      )

      PredictionDispatch.where(prediction_id: all_prediction_ids).delete_all
      Favorite.where(prediction_id: all_prediction_ids).delete_all
      Feedback.where(prediction_id: all_prediction_ids).delete_all
      favorites.delete_all
      feedbacks.update_all(user_id: nil)

      active_predictions.update_all(deleted_at: now, updated_at: now)
      auth_tokens.update_all(revoked_at: now, updated_at: now)

      update!(
        email: nil,
        name: nil,
        password_digest: nil,
        settings: {},
        anonymized_at: now
      )
    end
  end

  def soft_delete!
    update!(deleted_at: Time.current)
  end
end
