require "rails_helper"
require Rails.root.join("db/migrate/20261122210000_normalize_prediction_class_probabilities")

RSpec.describe NormalizePredictionClassProbabilities do
  before do
    %w[RAIN FOG SNOW CLEAR].each do |code|
      condition = WeatherCondition.find_or_create_by!(code: code)
      condition.update!(active: true, deleted_at: nil)
    end
  end

  it "uppercases probability keys, adds missing active classes and preserves unknown keys" do
    prediction = create(
      :prediction,
      weather_condition: nil,
      class_probabilities: {
        "rain" => 0.7,
        "HAIL" => 0.2,
        "fog" => 0.1
      }
    )

    described_class.new.up

    expect(prediction.reload.class_probabilities).to eq(
      "RAIN" => 0.7,
      "HAIL" => 0.2,
      "FOG" => 0.1,
      "SNOW" => 0.0,
      "CLEAR" => 0.0
    )
  end

  it "adds zero-probability entries to an empty probability object" do
    prediction = create(
      :prediction,
      weather_condition: nil,
      class_probabilities: {}
    )

    described_class.new.up

    expect(prediction.reload.class_probabilities).to eq(
      "RAIN" => 0.0,
      "FOG" => 0.0,
      "SNOW" => 0.0,
      "CLEAR" => 0.0
    )
  end
end
