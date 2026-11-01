require "rails_helper"

RSpec.describe "Predictions index", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }
  let!(:condition) { WeatherCondition.find_or_create_by!(code: "RAIN") }

  before do
    translation = condition.translations.find_or_initialize_by(locale: "ru")
    translation.update!(name: "Дождь")
  end

  it "возвращает последние 10 записей всех статусов в порядке от новых к старым" do
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

    expect(list.size).to eq(10)
    expect(names.first(2)).to eq(["Ошибка", "В процессе"])
    expect(list.first["status"]).to eq("failed")
    expect(list.second["status"]).to eq("pending")
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
