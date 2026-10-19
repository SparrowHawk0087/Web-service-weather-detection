class DemoExample < ApplicationRecord
  belongs_to :weather_condition
  has_many :translations, class_name: "DemoExampleTranslation", dependent: :destroy

  validates :storage_key, presence: true

  scope :ordered, -> { order(:display_order) }

  def translated(locale = I18n.locale)
    translations.find_by(locale: locale.to_s) || translations.first
  end
end