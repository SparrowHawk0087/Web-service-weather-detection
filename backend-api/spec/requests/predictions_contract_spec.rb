require "rails_helper"

RSpec.describe "Predictions contract", type: :request do
  let(:user) { create(:user, locale: "ru") }
  let(:headers) { auth_headers(token_for(user)) }
  let!(:condition) { WeatherCondition.find_or_create_by!(code: "SNOW") }
  let!(:prediction) do
    create(
      :prediction,
      :completed,
      user: user,
      weather_condition: condition,
      confidence: 0.92,
      class_probabilities: { "SNOW" => 0.92, "RAIN" => 0.05, "FOG" => 0.03 },
      storage_key: "#{SecureRandom.uuid}.jpg",
      original_filename: "road.jpg",
      ml_model_version: "vision-v1",
      ml_service_version: "mock-v1"
    )
  end

  before do
    condition.update!(active: true, deleted_at: nil)
    condition.translations.find_or_initialize_by(locale: "ru").update!(name: "Снег")
  end

  it "returns the same prediction object through REST and ActionCable" do
    websocket_prediction = nil

    expect(ActionCable.server).to receive(:broadcast) do |stream_name, event|
      expect(stream_name).to eq("predictions:user:#{user.id}")
      websocket_prediction = event.dig(:prediction).deep_symbolize_keys
    end

    PredictionStatusBroadcaster.broadcast(prediction)

    get "/predictions/#{prediction.id}", headers: headers

    expect(response).to have_http_status(:ok)
    rest_prediction = response.parsed_body.fetch("prediction").deep_symbolize_keys

    expect(websocket_prediction).to eq(rest_prediction)
  end

  it "does not expose storage keys or filesystem paths in REST responses" do
    get "/predictions/#{prediction.id}", headers: headers

    body = response.parsed_body.to_json

    expect(body).not_to include(prediction.storage_key)
    expect(body).not_to include(PredictionImageStorage::STORAGE_ROOT.to_s)
    expect(body).not_to include("heatmap_storage_key")
    expect(body).not_to include("error_message")
    expect(response.parsed_body.dig("prediction", "image_url"))
      .to eq("/predictions/#{prediction.id}/image")
  end
end
