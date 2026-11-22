require "rails_helper"

RSpec.describe PredictionResultContract do
  let!(:rain_condition) { create(:weather_condition, code: "RAIN", active: true) }
  let(:ml_response) do
    {
      prediction: {
        class: "rain",
        confidence: 0.92,
        probabilities: {
          "rain" => 0.92,
          "snow" => 0.05,
          "fog" => 0.03
        }
      },
      model_used: "vision-v1"
    }
  end

  describe "#call" do
    it "validates the response and normalizes class and probability codes" do
      result = described_class.new(ml_response).call

      expect(result).to eq(
        weather_condition: rain_condition,
        weather_code: "RAIN",
        confidence: 0.92,
        probabilities: {
          "RAIN" => 0.92,
          "SNOW" => 0.05,
          "FOG" => 0.03
        }
      )
    end

    it "accepts string-keyed ML payloads" do
      response = {
        "prediction" => {
          "class" => "RAIN",
          "confidence" => 0.92,
          "probabilities" => { "RAIN" => 0.92, "SNOW" => 0.05, "FOG" => 0.03 }
        }
      }

      expect(described_class.new(response).call[:weather_code]).to eq("RAIN")
    end

    it "accepts probability sums within the configured tolerance" do
      [0.99, 1.01].each do |sum|
        response = {
          prediction: {
            class: "RAIN",
            confidence: 0.9,
            probabilities: { "RAIN" => 0.9, "SNOW" => sum - 0.9 }
          }
        }

        expect { described_class.new(response).call }.not_to raise_error
      end
    end

    it "preserves probability entries for classes outside the current registry" do
      response = {
        prediction: {
          class: "RAIN",
          confidence: 0.92,
          probabilities: { "RAIN" => 0.92, "SNOW" => 0.05, "FOG" => 0.02, "HAIL" => 0.01 }
        }
      }

      result = described_class.new(response).call

      expect(result[:probabilities]).to include("HAIL" => 0.01)
    end

    it "rejects an unknown or inactive predicted class" do
      response = ml_response.deep_dup
      response[:prediction][:class] = "clear"

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /Unknown or inactive/)
    end

    it "rejects a response without the prediction object" do
      expect { described_class.new({ status: "success" }).call }
        .to raise_error(PredictionResultContract::InvalidResult, /Missing required field: prediction/)
    end

    it "rejects missing probabilities" do
      response = { prediction: { class: "RAIN", confidence: 0.92 } }

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /prediction.probabilities/)
    end

    [-0.01, 1.01].each do |invalid_probability|
      it "rejects probability #{invalid_probability} outside [0, 1]" do
        response = ml_response.deep_dup
        response[:prediction][:probabilities]["rain"] = invalid_probability
        response[:prediction][:confidence] = invalid_probability

        expect { described_class.new(response).call }
          .to raise_error(PredictionResultContract::InvalidResult, /between 0 and 1/)
      end
    end

    it "rejects non-numeric probability values" do
      response = ml_response.deep_dup
      response[:prediction][:probabilities]["rain"] = "0.92"

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /must be a number/)
    end

    it "rejects probability sums outside the configured tolerance" do
      response = {
        prediction: {
          class: "RAIN",
          confidence: 0.92,
          probabilities: { "RAIN" => 0.92, "SNOW" => 0.04, "FOG" => 0.02 }
        }
      }

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /must sum to 1/)
    end

    it "rejects a missing probability for the predicted class" do
      response = {
        prediction: {
          class: "RAIN",
          confidence: 0.92,
          probabilities: { "SNOW" => 0.08, "FOG" => 0.92 }
        }
      }

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /missing from probabilities/)
    end

    it "rejects confidence that differs from the predicted class probability" do
      response = ml_response.deep_dup
      response[:prediction][:confidence] = 0.91

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /Confidence must equal/)
    end

    it "rejects duplicate keys after uppercase normalization" do
      response = {
        prediction: {
          class: "RAIN",
          confidence: 0.92,
          probabilities: { "rain" => 0.92, "RAIN" => 0.04, "FOG" => 0.04 }
        }
      }

      expect { described_class.new(response).call }
        .to raise_error(PredictionResultContract::InvalidResult, /Duplicate probability class/)
    end
  end
end
