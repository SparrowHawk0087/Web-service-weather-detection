require "rails_helper"

RSpec.describe PredictionSerializer do
  let(:user) { create(:user) }
  let(:condition) { create(:weather_condition, code: "SNOW") }
  let(:storage_key) { "#{SecureRandom.uuid}.jpg" }
  let(:prediction) do
    create(
      :prediction,
      :completed,
      user: user,
      weather_condition: condition,
      confidence: 0.92,
      class_probabilities: {
        "fog" => 0.02,
        "rain" => 0.03,
        "snow" => 0.92,
        "clear" => 0.03
      },
      storage_key: storage_key,
      original_filename: "road-scene.jpg",
      ml_model_version: "vision-v1",
      ml_service_version: "mock-v1",
      processing_duration_ms: 1_250
    )
  end

  before do
    create(
      :weather_condition_translation,
      weather_condition: condition,
      locale: "ru",
      name: "Снег"
    )
    create(
      :weather_condition_translation,
      weather_condition: condition,
      locale: "en",
      name: "Snow"
    )
  end

  describe "#as_json" do
    it "builds the canonical public prediction payload" do
      payload = described_class.new(prediction, locale: "ru").as_json

      expect(payload).to include(
        id: prediction.id,
        public_id: prediction.public_id,
        status: "completed",
        weather_code: "SNOW",
        weather_condition: "Снег",
        confidence: 0.92,
        probabilities: {
          "FOG" => 0.02,
          "RAIN" => 0.03,
          "SNOW" => 0.92,
          "CLEAR" => 0.03
        },
        image_url: "/predictions/#{prediction.id}/image",
        image_content_type: "image/jpeg",
        ml_model_version: "vision-v1",
        ml_service_version: "mock-v1",
        original_filename: "road-scene.jpg",
        processing_duration_ms: 1_250
      )
    end

    it "uses the requested locale for the weather condition" do
      payload = described_class.new(prediction, locale: "en").as_json

      expect(payload[:weather_condition]).to eq("Snow")
    end

    it "uses the highest probability when a completed legacy prediction has no condition" do
      legacy_prediction = create(
        :prediction,
        :completed,
        user: user,
        weather_condition: nil,
        confidence: 0.8,
        class_probabilities: { "hail" => 0.8, "rain" => 0.2 }
      )

      payload = described_class.new(legacy_prediction, locale: "en").as_json

      expect(payload).to include(
        weather_code: "HAIL",
        weather_condition: "HAIL"
      )
    end

    %w[pending processing failed cancelled].each do |status|
      it "does not expose a classification result for #{status} predictions" do
        non_completed = create(
          :prediction,
          user: user,
          status: status,
          weather_condition: condition,
          confidence: 0.92,
          class_probabilities: { "SNOW" => 0.92, "RAIN" => 0.08 },
          error_code: status == "failed" ? "INVALID_MODEL_RESULT" : nil
        )

        payload = described_class.new(non_completed, locale: "ru").as_json

        expect(payload).to include(
          status: status,
          weather_code: nil,
          weather_condition: nil,
          confidence: nil,
          probabilities: {}
        )
      end
    end

    it "returns image metadata as nil when the image has been deleted" do
      prediction.update!(image_deleted_at: Time.current)

      payload = described_class.new(prediction, locale: "ru").as_json

      expect(payload[:image_url]).to be_nil
      expect(payload[:image_content_type]).to be_nil
    end

    it "serializes timestamps as ISO 8601 UTC values" do
      payload = described_class.new(prediction, locale: "ru").as_json

      expect(payload[:created_at]).to match(/Z\\z/)
      expect(payload[:updated_at]).to match(/Z\\z/)
      expect(Time.iso8601(payload[:created_at]).utc_offset).to eq(0)
    end

    it "does not expose storage identifiers or internal error details" do
      prediction.update!(error_message: "private storage failure")

      payload = described_class.new(prediction, locale: "ru").as_json
      serialized_json = payload.to_json

      expect(payload.keys).not_to include(:storage_key, :heatmap_storage_key, :error_message)
      expect(serialized_json).not_to include(storage_key)
      expect(serialized_json).not_to include("private storage failure")
      expect(serialized_json).not_to include(PredictionImageStorage::STORAGE_ROOT.to_s)
    end

    it "strips directory components from the original filename" do
      prediction.update!(original_filename: "../../private/road.jpg")

      payload = described_class.new(prediction, locale: "ru").as_json

      expect(payload[:original_filename]).to eq("road.jpg")
    end
  end
end
