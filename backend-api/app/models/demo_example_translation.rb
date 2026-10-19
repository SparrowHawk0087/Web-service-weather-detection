class DemoExampleTranslation < ApplicationRecord
  belongs_to :demo_example

  validates :locale, presence: true
  validates :title,  presence: true
end