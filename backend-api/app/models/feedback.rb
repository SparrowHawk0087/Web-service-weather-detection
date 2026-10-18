class Feedback < ApplicationRecord
  class InvalidTransition < StandardError; end

  TYPES      = %w[wrong_class bad_heatmap slow ui_issue other].freeze
  SEVERITIES = %w[low normal high critical].freeze
  STATUSES   = %w[new triaged in_progress resolved wont_fix duplicate].freeze

  TRANSITIONS = {
    "new"         => %w[triaged wont_fix duplicate],
    "triaged"     => %w[in_progress resolved wont_fix duplicate],
    "in_progress" => %w[resolved wont_fix],
    "resolved"    => %w[in_progress],
    "wont_fix"    => [],
    "duplicate"   => []
  }.freeze

  belongs_to :prediction
  belongs_to :user,             optional: true
  belongs_to :actual_condition, class_name: "WeatherCondition", optional: true
  belongs_to :reviewer,         class_name: "User",             optional: true

  validates :feedback_type, inclusion: { in: TYPES }
  validates :severity,      inclusion: { in: SEVERITIES }
  validates :status,        inclusion: { in: STATUSES }

  scope :open, -> { where(status: %w[new triaged in_progress]) }

  def triage!(reviewer:)
    transition_to!("triaged", reviewer: reviewer)
  end

  def start_work!(reviewer:)
    transition_to!("in_progress", reviewer: reviewer)
  end

  def resolve!(reviewer:, note: nil)
    transition_to!("resolved", reviewer: reviewer, resolution_note: note, reviewed_at: Time.current)
  end

  def wont_fix!(reviewer:, note: nil)
    transition_to!("wont_fix", reviewer: reviewer, resolution_note: note, reviewed_at: Time.current)
  end

  def reopen!(reviewer:)
    transition_to!("in_progress", reviewer: reviewer)
  end

  private

  def transition_to!(new_status, **attrs)
    allowed = TRANSITIONS.fetch(status, [])
    unless allowed.include?(new_status)
      raise InvalidTransition, "Нельзя перейти из '#{status}' в '#{new_status}'"
    end
    update!(status: new_status, **attrs)
  end
end