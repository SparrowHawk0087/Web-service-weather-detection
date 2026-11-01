require "rails_helper"

RSpec.describe AnalyzePredictionJob, type: :job do
  let(:user) { create(:user) }
  let(:condition) { create(:weather_condition, code: "RAIN") }
  let(:storage_key) { "#{SecureRandom.uuid}.png" }
  let(:prediction) do
    create(
      :prediction,
      user: user,
      status: "pending",
      storage_key: storage_key,
      original_filename: "road.png",
      ml_model_version: "vision-v1"
    )
  end

  before do
    FileUtils.mkdir_p(PredictionImageStorage::STORAGE_ROOT)
    File.binwrite(PredictionImageStorage.path_for(storage_key), "fake-image")
  end

  after do
    PredictionImageStorage.delete!(storage_key)
  end

  it "classifies an image and marks the prediction as completed" do
    allow(WeatherCondition).to receive(:active).and_return(WeatherCondition.where(id: condition.id))
    stub_request(:post, %r{/predict/?\z}).to_return(
      status: 200,
      headers: { "Content-Type" => "application/json" },
      body: {
        status: "success",
        prediction: {
          class: "rain",
          confidence: 0.92,
          probabilities: { rain: 0.92, snow: 0.05, fog: 0.03 }
        },
        model_used: "vision-v1"
      }.to_json
    )

    described_class.perform_now(prediction.id)

    expect(prediction.reload.status).to eq("completed")
    expect(prediction.confidence).to be_within(0.001).of(0.92)
    expect(prediction.weather_condition).to eq(condition)
  end
end
