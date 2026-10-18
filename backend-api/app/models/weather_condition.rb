class WeatherCondition < ApplicationRecord
  has_many :translations, class_name: "WeatherConditionTranslation", dependent: :destroy
  has_many :predictions,  dependent: :restrict_with_error
  has_many :demo_examples, dependent: :restrict_with_error

  validates :code, presence: true, uniqueness: true, format: { with: /\A[A-Z_]+\z/ }
  validates :min_confidence, numericality: { in: 0..1 }

  scope :active, -> { where(active: true, deleted_at: nil) }

  def translated(locale = I18n.locale)
    translations.find_by(locale: locale.to_s) || translations.first
  end

  def accepts_confidence?(confidence)
    confidence.present? && confidence >= min_confidence
  end
end