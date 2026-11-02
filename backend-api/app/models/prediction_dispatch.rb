class PredictionDispatch < ApplicationRecord
  belongs_to :prediction

  validates :attempt_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :undispatched, -> { where(dispatched_at: nil) }
end
