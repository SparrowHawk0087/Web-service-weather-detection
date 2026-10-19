class WeatherConditionTranslation < ApplicationRecord
  belongs_to :weather_condition

  validates :locale, presence: true
  validates :name,   presence: true
end