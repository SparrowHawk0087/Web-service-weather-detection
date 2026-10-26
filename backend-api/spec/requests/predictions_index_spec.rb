require "rails_helper"

RSpec.describe "Predictions index", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let!(:condition) { create(:weather_condition, code: "RAIN") }

  before do
    create(:weather_condition_translation, weather_condition: condition, locale: "ru", name: "Дождь")
  end

  it "возвращает только completed, не больше 10 и в порядке от новых к старым" do
    11.times do |index|
      create(
        :prediction,
        :completed,
        user: user,
        weather_condition: condition,
        name: "Запись #{index}",
        created_at: (index + 1).hours.ago
      )
    end

    create(:prediction, user: user, status: "pending", name: "В процессе")
    create(:prediction, user: user, status: "failed", name: "Ошибка")

    get "/predictions", headers: headers

    expect(response).to have_http_status(:ok)
    list = response.parsed_body["predictions"]
    names = list.map { |prediction| prediction["name"] }
    expect(list.size).to eq(10)
    expect(names).to eq((0..9).map { |index| "Запись #{index}" })
    expect(names).not_to include("В процессе")
    expect(names).not_to include("Ошибка")
  end

  it "возвращает top probability, если weather_condition не найден" do
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
      "weather_condition" => "hail",
      "weather_code" => "hail"
    )
  end
end
