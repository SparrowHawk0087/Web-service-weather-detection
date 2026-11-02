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

    stream = "predictions:user:#{user.id}"
    messages = ActionCable.server.pubsub.broadcasts(stream).map do |message|
      ActiveSupport::JSON.decode(message)
    end

    statuses = messages.filter_map do |message|
      message.dig("prediction", "status") if message["type"] == "prediction.updated"
    end

    expect(statuses).to include("pending", "processing", "completed")
  end
end
