require "rails_helper"

RSpec.describe "Prediction pipeline integration", type: :request do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let(:condition) { create(:weather_condition, code: "RAIN") }

  after do
    Prediction.where(user: user).find_each do |prediction|
      PredictionImageStorage.delete!(prediction.storage_key) if prediction.storage_key&.match?(/\A[0-9a-f-]{36}\./i)
    end
  end

  it "accepts an image, processes it, persists the result, and broadcasts status updates" do
    weather_condition = condition
    allow(WeatherCondition).to receive(:active).and_return(
      WeatherCondition.where(id: weather_condition.id)
    )

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

    queue_adapter = AnalyzePredictionJob.queue_adapter
    queue_adapter.enqueued_jobs.clear
    queue_adapter.performed_jobs.clear

    expect do
      perform_enqueued_jobs do
        post "/predictions/async",
             params: {
               file: upload_fixture("sample.png", "image/png"),
               model_id: "vision-v1"
             },
             headers: headers
      end
    end.to change(Prediction, :count).by(1)

    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body["status"]).to eq("accepted")

    prediction = Prediction.find_by!(user: user)
    expect(prediction.status).to eq("completed")
    expect(prediction.weather_condition).to eq(weather_condition)
    expect(prediction.confidence).to be_within(0.001).of(0.92)
    expect(prediction.class_probabilities["rain"]).to be_within(0.001).of(0.92)
    expect(prediction.finished_at).to be_present
    expect(prediction_statuses_for(user)).to include("pending", "processing", "completed")
  end

  it "retries a transient ML failure and completes when the service recovers" do
    weather_condition = condition
    allow(WeatherCondition).to receive(:active).and_return(
      WeatherCondition.where(id: weather_condition.id)
    )

    request_stub = stub_request(:post, %r{/predict/?\z}).to_return(
      {
        status: 503,
        headers: { "Content-Type" => "application/json" },
        body: { detail: "Temporary ML service outage" }.to_json
      },
      {
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
      }
    )

    queue_adapter = AnalyzePredictionJob.queue_adapter
    queue_adapter.enqueued_jobs.clear
    queue_adapter.performed_jobs.clear

    perform_enqueued_jobs(at: 1.hour.from_now) do
      post "/predictions/async",
           params: {
             file: upload_fixture("sample.png", "image/png"),
             model_id: "vision-v1"
           },
           headers: headers
    end

    expect(response).to have_http_status(:accepted)

    prediction = Prediction.find_by!(user: user)
    expect(prediction.status).to eq("completed")
    expect(prediction.retry_count).to eq(1)
    expect(prediction.weather_condition).to eq(weather_condition)
    expect(prediction_statuses_for(user)).to include("pending", "processing", "completed")
    expect(request_stub).to have_been_made.times(2)
  end

  it "marks the prediction as failed after four unsuccessful ML requests" do
    request_stub = stub_request(:post, %r{/predict/?\z}).to_return(
      status: 503,
      headers: { "Content-Type" => "application/json" },
      body: { detail: "Mock ML service is unavailable" }.to_json
    )

    queue_adapter = AnalyzePredictionJob.queue_adapter
    queue_adapter.enqueued_jobs.clear
    queue_adapter.performed_jobs.clear

    perform_enqueued_jobs(at: 1.hour.from_now) do
      post "/predictions/async",
           params: {
             file: upload_fixture("sample.png", "image/png"),
             model_id: "vision-v1"
           },
           headers: headers
    end

    expect(response).to have_http_status(:accepted)

    prediction = Prediction.find_by!(user: user)
    expect(prediction.status).to eq("failed")
    expect(prediction.retry_count).to eq(4)
    expect(prediction.error_code).to eq("ML_SERVICE_ERROR")
    expect(prediction.error_message).to eq("Mock ML service is unavailable")
    expect(prediction.finished_at).to be_present
    expect(prediction_statuses_for(user)).to include("pending", "processing", "failed")
    expect(request_stub).to have_been_made.times(4)
  end

  private

  def prediction_statuses_for(user)
    ActionCable.server.pubsub.broadcasts("predictions:user:#{user.id}").filter_map do |message|
      payload = ActiveSupport::JSON.decode(message)
      payload.dig("prediction", "status") if payload["type"] == "prediction.updated"
    end
  end
end
