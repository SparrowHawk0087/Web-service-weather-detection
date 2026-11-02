require "rails_helper"

RSpec.describe "Prediction pipeline integration", type: :request do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let(:condition) { WeatherCondition.find_or_create_by!(code: "RAIN") }

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

  it "accepts and completes multiple independent submissions" do
    weather_condition = condition
    allow(WeatherCondition).to receive(:active).and_return(
      WeatherCondition.where(id: weather_condition.id)
    )
    request_stub = stub_ml_success

    queue_adapter = AnalyzePredictionJob.queue_adapter
    queue_adapter.enqueued_jobs.clear
    queue_adapter.performed_jobs.clear

    owners = Array.new(3) { create(:user) }

    expect do
      owners.each do |owner|
        post "/predictions/async",
             params: {
               file: upload_fixture("sample.png", "image/png"),
               model_id: "vision-v1"
             },
             headers: auth_headers(token_for(owner))

        expect(response).to have_http_status(:accepted)
      end
    end.to change(Prediction, :count).by(3)

    # All submissions must be queued before the test adapter starts performing
    # any job, matching the burst of requests handled by the real Sidekiq queue.
    expect(queue_adapter.enqueued_jobs.size).to eq(3)
    perform_enqueued_jobs
    expect(queue_adapter.performed_jobs.size).to eq(3)

    predictions = Prediction.where(user: owners).order(:id)
    expect(predictions.count).to eq(3)
    expect(predictions.map(&:status)).to all(eq("completed"))
    expect(predictions.map(&:weather_condition_id)).to all(eq(weather_condition.id))
    expect(request_stub).to have_been_made.times(3)
  ensure
    Prediction.where(user: owners).find_each do |prediction|
      PredictionImageStorage.delete!(prediction.storage_key) if prediction.storage_key.present?
    end if owners
  end

  it "keeps the prediction recoverable when Redis is unavailable during enqueue" do
    allow(AnalyzePredictionJob).to receive(:perform_later).and_raise(StandardError, "Redis unavailable")

    post "/predictions/async",
         params: {
           file: upload_fixture("sample.png", "image/png"),
           model_id: "vision-v1"
         },
         headers: headers

    expect(response).to have_http_status(:accepted)

    prediction = Prediction.find_by!(user: user)
    dispatch = prediction.dispatch

    expect(prediction.status).to eq("pending")
    expect(dispatch).to be_present
    expect(dispatch.dispatched_at).to be_nil
    expect(dispatch.attempt_count).to eq(1)
    expect(dispatch.last_error).to include("Redis unavailable")

    # The first enqueue failure was simulated above. Restore Active Job's
    # real test-adapter implementation before exercising recovery.
    allow(AnalyzePredictionJob).to receive(:perform_later).and_call_original

    dispatch.update!(last_attempt_at: 2.minutes.ago)

    expect do
      RecoverPredictionDispatchesJob.perform_now
    end.to have_enqueued_job(AnalyzePredictionJob).with(prediction.id)

    expect(dispatch.reload.dispatched_at).to be_present
    expect(dispatch.last_error).to be_nil
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
