require "rails_helper"

RSpec.describe "Predictions happy path", type: :request do
  let(:email) { "driver-#{SecureRandom.hex(4)}@example.com" }
  let(:password) { "password123" }
  let!(:rain) { create(:weather_condition, code: "RAIN") }

  before do
    create(:weather_condition_translation, weather_condition: rain, locale: "ru", name: "Дождь")
  end

  it "проводит пользователя от регистрации до удаления записи", :aggregate_failures do
    # 1. Регистрация
    post "/signup", params: {
      user: {
        name: "Тестовый водитель",
        email: email,
        password: password,
        password_confirmation: password
      }
    }, as: :json

    expect(response).to have_http_status(:created)
    signup_body = response.parsed_body
    expect(signup_body.dig("user", "email")).to eq(email)
    expect(signup_body.dig("user", "role")).to eq("user")
    expect(signup_body["api_token"]).to be_present

    # 2. Логин
    post "/login", params: { email: email, password: password }, as: :json

    expect(response).to have_http_status(:created)
    token = response.parsed_body["api_token"]
    expect(token).to be_present
    headers = auth_headers(token)

    # 3. Анализ: ML вызывается, но запись в историю ещё не создаётся
    stub_ml_success(
      weather_class: "rain",
      confidence: 0.92,
      probabilities: { "rain" => 0.92, "snow" => 0.05, "fog" => 0.03 }
    )

    expect do
      post "/predictions/analyze",
           params: { file: upload_fixture("sample.png", "image/png"), model_id: "vision-v1" },
           headers: headers
    end.not_to change(Prediction, :count)

    expect(response).to have_http_status(:ok)
    analyze_body = response.parsed_body
    expect(analyze_body["status"]).to eq("success")
    expect(analyze_body.dig("prediction", "weather_code")).to eq("RAIN")
    expect(analyze_body.dig("prediction", "weather_condition")).to eq("Дождь")
    expect(analyze_body.dig("prediction", "confidence")).to be_within(0.001).of(0.92)
    expect(analyze_body.dig("prediction", "probabilities")).to eq(
      "rain" => 0.92, "snow" => 0.05, "fog" => 0.03
    )
    expect(
      a_request(:post, %r{/predict/?\z}).with { |request| request.body.to_s.b.include?("vision-v1".b) }
    ).to have_been_made

    # 4. Сохранение результата в историю
    expect do
      post "/predictions", params: {
        name: "Утренняя поездка",
        weather_code: "RAIN",
        confidence: "0.92",
        probabilities: { "rain" => 0.92, "snow" => 0.05, "fog" => 0.03 }.to_json,
        model_version: "vision-v1",
        image: upload_fixture("sample.png", "image/png")
      }, headers: headers
    end.to change(Prediction, :count).by(1)

    expect(response).to have_http_status(:created)
    prediction_id = response.parsed_body.dig("prediction", "id")
    expect(prediction_id).to be_present

    prediction = Prediction.find(prediction_id)
    user = User.find_by!(email: email)
    expect(prediction.user).to eq(user)
    expect(prediction.weather_condition).to eq(rain)
    expect(prediction.name).to eq("Утренняя поездка")
    expect(prediction.confidence).to be_within(0.001).of(0.92)
    expect(prediction.class_probabilities).to eq(
      "rain" => 0.92, "snow" => 0.05, "fog" => 0.03
    )
    expect(prediction.ml_model_version).to eq("vision-v1")
    expect(prediction.original_filename).to eq("sample.png")
    expect(prediction.image_size_bytes).to be > 0
    expect(prediction.storage_key).to start_with("temp_")

    # 5. История
    get "/predictions", headers: headers

    expect(response).to have_http_status(:ok)
    list = response.parsed_body["predictions"]
    expect(list.size).to eq(1)
    expect(list.first).to include(
      "id" => prediction_id,
      "name" => "Утренняя поездка",
      "status" => "completed",
      "weather_condition" => "Дождь",
      "weather_code" => "RAIN"
    )
    expect(list.first["confidence"]).to be_within(0.001).of(0.92)
    expect(list.first["probabilities"]).to eq(
      "rain" => 0.92, "snow" => 0.05, "fog" => 0.03
    )

    # 6. Переименование
    patch "/predictions/#{prediction_id}",
          params: { name: "Вечерняя поездка" },
          as: :json,
          headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["name"]).to eq("Вечерняя поездка")
    expect(prediction.reload.name).to eq("Вечерняя поездка")

    # 7. Удаление
    delete "/predictions/#{prediction_id}", headers: headers

    expect(response).to have_http_status(:no_content)
    expect(Prediction.exists?(prediction_id)).to be(false)

    get "/predictions", headers: headers
    expect(response.parsed_body["predictions"]).to be_empty
  end
end
