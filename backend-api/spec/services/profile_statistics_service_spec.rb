require "rails_helper"

RSpec.describe ProfileStatisticsService do
  let(:user) { create(:user, timezone: "UTC", locale: "ru") }
  let(:other_user) { create(:user) }

  def condition_with_translation(code, name)
    condition = WeatherCondition.find_by(code: code) || create(:weather_condition, code: code)
    translation = WeatherConditionTranslation.find_or_initialize_by(weather_condition: condition, locale: "ru")
    translation.update!(name: name)
    condition
  end

  it "aggregates only the current user's real, non-deleted predictions and model timings" do
    fog = condition_with_translation("FOG", "Туман")
    rain = condition_with_translation("RAIN", "Дождь")

    create(
      :prediction, :completed, user: user, weather_condition: fog, confidence: 0.8,
      ml_model_version: "vision-v1", processing_duration_ms: 800
    )
    create(
      :prediction, :completed, user: user, weather_condition: nil, confidence: 0.4,
      ml_model_version: "vision-v1", processing_duration_ms: 1_000
    )
    create(:prediction, user: user, status: "processing")
    create(:prediction, :completed, user: user, weather_condition: rain, is_demo: true)
    create(:prediction, :completed, user: user, weather_condition: rain, deleted_at: Time.current)
    create(
      :prediction, :completed, user: other_user, weather_condition: rain,
      ml_model_version: "storm-detector", processing_duration_ms: 10
    )

    result = described_class.new(user).call

    expect(result.dig(:summary, :total_analyses)).to eq(3)
    expect(result.dig(:summary, :completed)).to eq(2)
    expect(result.dig(:summary, :in_progress)).to eq(1)
    expect(result.dig(:summary, :failed)).to eq(0)
    expect(result.dig(:summary, :avg_confidence)).to be_within(0.001).of(0.6)

    distribution = result.fetch(:class_distribution).index_by { |item| item[:code] }
    expect(distribution.dig("FOG", :label)).to eq("Туман")
    expect(distribution.dig("FOG", :count)).to eq(1)
    expect(distribution.dig("RAIN", :count)).to eq(0)
    expect(distribution.dig("UNKNOWN", :count)).to eq(1)
    expect(distribution.dig("UNKNOWN", :percentage)).to eq(50.0)

    models = result.fetch(:models).index_by { |item| item[:model_id] }
    expect(models.dig("vision-v1", :avg_response_time_ms)).to eq(900)
    expect(models.dig("vision-v1", :sample_count)).to eq(2)
    expect(models.dig("vision-v2", :avg_response_time_ms)).to be_nil
    expect(models.dig("storm-detector", :avg_response_time_ms)).to be_nil
  end

  it "returns the selected weekly activity and keeps the confidence chart on its own 84-day window" do
    fog = condition_with_translation("FOG", "Туман")

    travel_to Time.utc(2026, 11, 23, 12, 0, 0) do
      create(
        :prediction, :completed, user: user, weather_condition: fog,
        confidence: 0.9, created_at: Time.utc(2026, 11, 23, 10, 0, 0)
      )
      create(
        :prediction, user: user, status: "pending",
        created_at: Time.utc(2026, 11, 23, 11, 0, 0)
      )

      result = described_class.new(user, activity_period: "week").call

      expect(result.fetch(:activity).size).to eq(7)
      expect(result.fetch(:activity).first[:date]).to eq("2026-11-23")
      expect(result.fetch(:activity).last[:date]).to eq("2026-11-29")
      expect(result.fetch(:activity).first[:count]).to eq(2)
      expect(result.fetch(:activity_period)).to eq("week")
      expect(result.fetch(:activity_offset)).to eq(0)
      expect(result.fetch(:confidence_activity).size).to eq(84)
      expect(result.fetch(:confidence_activity).last).to include(date: "2026-11-23", count: 2)
      expect(result.fetch(:confidence_trend)).to contain_exactly(
        include(date: "2026-11-23", avg_confidence: 0.9, sample_count: 1)
      )
    end
  end

  it "pages through previous weeks, months, and years using the user's timezone" do
    travel_to Time.utc(2026, 11, 23, 12, 0, 0) do
      create(:prediction, user: user, status: "processing", created_at: Time.utc(2026, 11, 19, 12, 0, 0))
      create(:prediction, user: user, status: "processing", created_at: Time.utc(2026, 10, 20, 12, 0, 0))
      create(:prediction, user: user, status: "processing", created_at: Time.utc(2025, 6, 20, 12, 0, 0))

      week = described_class.new(user, activity_period: "week", activity_offset: -1).call
      expect(week.fetch(:activity).size).to eq(7)
      expect(week.fetch(:activity).first[:date]).to eq("2026-11-16")
      expect(week.fetch(:activity).last[:date]).to eq("2026-11-22")
      expect(week.fetch(:activity).find { |item| item[:date] == "2026-11-19" }[:count]).to eq(1)

      month = described_class.new(user, activity_period: "month", activity_offset: -1).call
      expect(month.fetch(:activity).size).to eq(31)
      expect(month.fetch(:activity).first[:date]).to eq("2026-10-01")
      expect(month.fetch(:activity).last[:date]).to eq("2026-10-31")
      expect(month.fetch(:activity).find { |item| item[:date] == "2026-10-20" }[:count]).to eq(1)

      year = described_class.new(user, activity_period: "year", activity_offset: -1).call
      expect(year.fetch(:activity).size).to eq(12)
      expect(year.fetch(:activity).first[:date]).to eq("2025-01-01")
      expect(year.fetch(:activity).last[:date]).to eq("2025-12-01")
      expect(year.fetch(:activity).find { |item| item[:date] == "2025-06-01" }[:count]).to eq(1)
    end
  end

  it "returns the configured models even when no completed predictions exist" do
    result = described_class.new(user).call
    models = result.fetch(:models).index_by { |item| item[:model_id] }

    expect(models.keys).to contain_exactly("vision-v1", "vision-v2", "storm-detector")
    expect(models.values).to all(include(avg_response_time_ms: nil, sample_count: 0, measured_count: 0))
  end

  it "clamps activity navigation to supported periods and the present" do
    future = described_class.new(user, activity_period: "year", activity_offset: 8).call
    ancient = described_class.new(user, activity_period: "year", activity_offset: -500).call

    expect(future.fetch(:activity_offset)).to eq(0)
    expect(ancient.fetch(:activity_offset)).to eq(-20)
  end
end
