require "rails_helper"

RSpec.describe ProfileStatisticsService do
  let(:user) { create(:user, timezone: "UTC", locale: "ru") }
  let(:other_user) { create(:user) }

  def condition_with_translation(code, name)
    condition = WeatherCondition.find_by(code: code) || create(:weather_condition, code: code)
    translation = WeatherConditionTranslation.find_or_initialize_by(
      weather_condition: condition,
      locale: "ru"
    )
    translation.update!(name: name)
    condition
  end

  it "aggregates only the current user's real, non-deleted predictions" do
    fog = condition_with_translation("FOG", "Туман")
    rain = condition_with_translation("RAIN", "Дождь")

    create(:prediction, :completed, user: user, weather_condition: fog, confidence: 0.8)
    create(:prediction, :completed, user: user, weather_condition: nil, confidence: 0.4)
    create(:prediction, user: user, status: "processing")
    create(:prediction, :completed, user: user, weather_condition: rain, is_demo: true)
    create(:prediction, :completed, user: user, weather_condition: rain, deleted_at: Time.current)
    create(:prediction, :completed, user: other_user, weather_condition: rain)

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
  end

  it "returns 84 timezone-aware activity days and daily confidence points" do
    fog = condition_with_translation("FOG", "Туман")

    travel_to Time.utc(2026, 11, 23, 12, 0, 0) do
      create(
        :prediction, :completed, user: user, weather_condition: fog,
        confidence: 0.9, created_at: 2.hours.ago
      )
      create(:prediction, user: user, status: "pending", created_at: 1.hour.ago)

      result = described_class.new(user).call

      expect(result.fetch(:activity).size).to eq(84)
      expect(result.fetch(:activity).last).to include(date: "2026-11-23", count: 2)
      expect(result.fetch(:confidence_trend)).to contain_exactly(
        include(date: "2026-11-23", avg_confidence: 0.9, sample_count: 1)
      )
    end
  end
end
