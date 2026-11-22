require "rails_helper"

RSpec.describe "Predictions index", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let!(:condition) { WeatherCondition.find_or_create_by!(code: "RAIN") }

  before do
    translation = condition.translations.find_or_initialize_by(locale: "ru")
    translation.update!(name: "Дождь")
  end

  it "returns the latest predictions in descending order with the default page size" do
    11.times do |index|
      create(
        :prediction,
        :completed,
        user: user,
        weather_condition: condition,
        name: "Запись #{index}",
        created_at: (index + 2).hours.ago
      )
    end

    create(:prediction, user: user, status: "pending", name: "В процессе", created_at: 1.minute.ago)
    create(:prediction, user: user, status: "failed", name: "Ошибка", created_at: 30.seconds.ago)

    get "/predictions", headers: headers

    expect(response).to have_http_status(:ok)
    list = response.parsed_body["predictions"]
    names = list.map { |prediction| prediction["name"] }

    expect(list.size).to eq(13)
    expect(names.first(2)).to eq(["Ошибка", "В процессе"])
    expect(list.first["status"]).to eq("failed")
    expect(list.second["status"]).to eq("pending")
    expect(response.parsed_body["pagination"]).to eq(
      "page" => 1,
      "per_page" => 20,
      "total_count" => 13,
      "total_pages" => 1
    )
  end

  it "paginates predictions and caps per_page at 100" do
    25.times do |index|
      create(:prediction, user: user, name: "Prediction #{index}", created_at: (index + 1).minutes.ago)
    end

    get "/predictions", params: { page: 2, per_page: 10 }, headers: headers

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body["predictions"].size).to eq(10)
    expect(body.dig("pagination", "page")).to eq(2)
    expect(body.dig("pagination", "per_page")).to eq(10)
    expect(body.dig("pagination", "total_count")).to eq(25)
    expect(body.dig("pagination", "total_pages")).to eq(3)

    get "/predictions", params: { per_page: 101 }, headers: headers
    expect(response.parsed_body.dig("pagination", "per_page")).to eq(100)
  end

  it "returns the top probability code when the condition is missing" do
    create(
      :prediction,
      :undefined_condition,
      user: user,
      name: "Без справочника",
      class_probabilities: { "hail" => 0.8, "rain" => 0.2 }
    )

    get "/predictions", headers: headers

    expect(response).to have_http_status(:ok)
    prediction = response.parsed_body["predictions"].first
    expect(prediction).to include(
      "weather_condition" => "HAIL",
      "weather_code" => "HAIL"
    )
  end
end
