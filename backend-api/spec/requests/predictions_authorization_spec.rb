require "rails_helper"

RSpec.describe "Predictions authorization", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let!(:own_prediction) { create(:prediction, :completed, user: user, name: "Моя запись") }
  let!(:foreign_prediction) { create(:prediction, :completed, user: other_user, name: "Чужая запись") }

  it "возвращает 401 без токена" do
    get "/predictions"
    expect(response).to have_http_status(:unauthorized)

    post "/predictions/analyze"
    expect(response).to have_http_status(:unauthorized)

    post "/predictions", params: { weather_code: "RAIN", confidence: "0.9" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "не показывает в истории записи другого пользователя" do
    get "/predictions", headers: auth_headers(token_for(user))

    expect(response).to have_http_status(:ok)
    ids = response.parsed_body["predictions"].map { |prediction| prediction["id"] }
    expect(ids).to contain_exactly(own_prediction.id)
    expect(ids).not_to include(foreign_prediction.id)
  end

  it "не позволяет переименовать чужую запись" do
    patch "/predictions/#{foreign_prediction.id}",
          params: { name: "Взлом" },
          as: :json,
          headers: auth_headers(token_for(user))

    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body["error"]).to be_present
    expect(foreign_prediction.reload.name).to eq("Чужая запись")
  end

  it "не позволяет удалить чужую запись" do
    delete "/predictions/#{foreign_prediction.id}", headers: auth_headers(token_for(user))

    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body["error"]).to be_present
    expect(Prediction.exists?(foreign_prediction.id)).to be(true)
  end
end
