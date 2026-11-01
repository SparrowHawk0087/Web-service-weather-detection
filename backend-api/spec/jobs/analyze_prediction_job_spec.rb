require "rails_helper"

RSpec.describe AnalyzePredictionJob, type: :job do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:condition) { WeatherCondition.find_or_create_by!(code: "RAIN") }
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

  it "returns the prediction to pending and enqueues a retry after a transient error" do
    client = instance_double(MlService::WeatherPredictionClient)
    allow(MlService::WeatherPredictionClient).to receive(:new).and_return(client)
    allow(client).to receive(:call).and_raise(
      MlService::WeatherPredictionClient::TransientError.new(
        "ML service is temporarily unavailable",
        error_code: "ML_SERVICE_UNAVAILABLE"
      )
    )

    expect do
      described_class.perform_now(prediction.id)
    end.to have_enqueued_job(described_class).with(prediction.id)

    expect(prediction.reload.status).to eq("pending")
    expect(prediction.retry_count).to eq(1)
    expect(prediction.started_at).to be_nil
  end

  it "marks the prediction as failed after exhausting transient retries" do
    queue_adapter = described_class.queue_adapter
    queue_adapter.enqueued_jobs.clear
    queue_adapter.performed_jobs.clear

    client = instance_double(MlService::WeatherPredictionClient)
    allow(MlService::WeatherPredictionClient).to receive(:new).and_return(client)
    allow(client).to receive(:call).and_raise(
      MlService::WeatherPredictionClient::TransientError.new(
        "ML service is temporarily unavailable",
        error_code: "ML_SERVICE_UNAVAILABLE"
      )
    )

    perform_enqueued_jobs(at: 1.hour.from_now) do
      described_class.perform_later(prediction.id)
    end

    expect(client).to have_received(:call).exactly(4).times
    expect(prediction.reload.status).to eq("failed")
    expect(prediction.retry_count).to eq(4)
    expect(prediction.error_code).to eq("ML_SERVICE_UNAVAILABLE")
    expect(prediction.finished_at).to be_present
  end

  it "marks a rejected image as failed without retrying it" do
    client = instance_double(MlService::WeatherPredictionClient)
    allow(MlService::WeatherPredictionClient).to receive(:new).and_return(client)
    allow(client).to receive(:call).and_raise(
      MlService::WeatherPredictionClient::RejectedFileError.new(
        "Некорректное изображение",
        error_code: "INVALID_IMAGE"
      )
    )

    expect { described_class.perform_now(prediction.id) }.not_to raise_error

    expect(prediction.reload.status).to eq("failed")
    expect(prediction.error_code).to eq("INVALID_IMAGE")
    expect(prediction.error_message).to eq("Некорректное изображение")
    expect(prediction.finished_at).to be_present
  end

  it "marks an unexpected processing error as failed" do
    client = instance_double(MlService::WeatherPredictionClient)
    allow(MlService::WeatherPredictionClient).to receive(:new).and_return(client)
    allow(client).to receive(:call).and_raise(StandardError, "unexpected failure")

    expect { described_class.perform_now(prediction.id) }.not_to raise_error

    expect(prediction.reload.status).to eq("failed")
    expect(prediction.error_code).to eq("PROCESSING_ERROR")
    expect(prediction.error_message).to eq("unexpected failure")
    expect(prediction.finished_at).to be_present
  end
end
