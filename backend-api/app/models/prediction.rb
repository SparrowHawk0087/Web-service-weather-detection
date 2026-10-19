class Prediction < ApplicationRecord
  STATUSES = %w[pending processing completed failed cancelled].freeze

  belongs_to :user
  belongs_to :weather_condition, optional: true
  has_many :favorites,  dependent: :destroy
  has_many :feedbacks,  dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validates :confidence, numericality: { in: 0..1 }, allow_nil: true

  scope :recent,    -> { order(created_at: :desc) }
  scope :completed, -> { where(status: "completed") }
  scope :undefined, -> { where(status: "completed", weather_condition_id: nil) }

  def claim!
    self.class.where(id: id, status: "pending")
        .update_all(status: "processing", started_at: Time.current, updated_at: Time.current) == 1
  end

  def complete!(weather_condition:, confidence:, class_probabilities:, **extra)
    updated = self.class.where(id: id, status: "processing").update_all(
      {
        status:               "completed",
        weather_condition_id: weather_condition&.id,
        confidence:           confidence,
        class_probabilities:  class_probabilities,
        processed_at:         Time.current,
        finished_at:          Time.current,
        updated_at:           Time.current
      }.merge(extra)
    )
    reload
    updated == 1
  end

  def fail!(error_code:, error_message: nil)
    updated = self.class.where(id: id, status: %w[pending processing]).update_all(
      status:        "failed",
      error_code:    error_code,
      error_message: error_message,
      finished_at:   Time.current,
      updated_at:    Time.current
    )
    reload
    updated == 1
  end

  def undefined?
    status == "completed" && weather_condition_id.nil?
  end

  def low_confidence?
    return false if confidence.nil? || weather_condition.nil?
    !weather_condition.accepts_confidence?(confidence)
  end

  def forget_image!
    update!(storage_key: nil, heatmap_storage_key: nil, image_deleted_at: Time.current)
  end

  def soft_delete!
    update!(deleted_at: Time.current)
  end

  def owned_by?(other_user)
    user_id == other_user.id
  end
end