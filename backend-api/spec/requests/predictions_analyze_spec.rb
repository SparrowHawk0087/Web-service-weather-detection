require "rails_helper"

RSpec.describe "Predictions analyze", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let!(:rain) { create(:weather_condition, code: "RAIN") }

  before do
    create(:weather_condition_translation, weather_condition: rain, locale: "ru", name: "Дождь")
  end

  it "возвращает классификацию и переводит код в название" do
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
    body = response.parsed_body
    expect(body["status"]).to eq("success")
    expect(body.dig("prediction", "weather_code")).to eq("RAIN")
    expect(body.dig("prediction", "weather_condition")).to eq("Дождь")
    expect(body.dig("prediction", "confidence")).to be_within(0.001).of(0.92)
    expect(body.dig("prediction", "probabilities")).to eq(
      "rain" => 0.92, "snow" => 0.05, "fog" => 0.03
    )
  end

  it "передаёт model_id в ML-сервис" do
    stub_ml_success

    post "/predictions/analyze",
         params: { file: upload_fixture("sample.png", "image/png"), model_id: "vision-v2" },
         headers: headers

    expect(response).to have_http_status(:ok)
    expect(
      a_request(:post, %r{/predict/?\z}).with { |request| request.body.to_s.b.include?("vision-v2".b) }
    ).to have_been_made
  end

  it "возвращает 400 без файла" do
    post "/predictions/analyze", params: {}, headers: headers

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body["error"]).to eq("Файл не передан")
  end

  it "возвращает 422, если ML отверг файл как не-изображение" do
    stub_ml_error(status: 400, detail: "Файл должен быть изображением или ZIP-архивом")

    post "/predictions/analyze",
         params: { file: upload_fixture("notes.txt", "text/plain") },
         headers: headers

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["error"]).to be_present
    expect(response.parsed_body.dig("details", "detail")).to eq(
      "Файл должен быть изображением или ZIP-архивом"
    )
  end

  it "возвращает 500, если ML-сервис недоступен" do
    stub_ml_unavailable

    post "/predictions/analyze",
         params: { file: upload_fixture("sample.png", "image/png") },
         headers: headers

    expect(response).to have_http_status(:internal_server_error)
    expect(response.parsed_body["error"]).to eq("Ошибка ML-сервиса")
  end

  it "возвращает 500, если ML-сервис ответил ошибкой" do
    stub_ml_error(status: 500, detail: "Internal ML error")

    post "/predictions/analyze",
         params: { file: upload_fixture("sample.png", "image/png") },
         headers: headers

    expect(response).to have_http_status(:internal_server_error)
    expect(response.parsed_body["error"]).to eq("Ошибка ML-сервиса")
    expect(response.parsed_body.dig("details", "details", "detail")).to eq("Internal ML error")
  end

  it "не падает, если ML вернул класс, которого нет в справочнике" do
    stub_ml_success(
      weather_class: "hail",
      confidence: 0.88,
      probabilities: { "hail" => 0.88, "rain" => 0.07, "snow" => 0.05 }
    )

    post "/predictions/analyze",
         params: { file: upload_fixture("sample.png", "image/png") },
         headers: headers

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body.dig("prediction", "weather_code")).to eq("HAIL")
    expect(body.dig("prediction", "weather_condition")).to eq("HAIL")
  end
end
