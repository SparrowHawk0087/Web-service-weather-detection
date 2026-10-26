require "rails_helper"

RSpec.describe "Authentication", type: :request do
  let(:user) { create(:user, password: "password123") }

  it "возвращает 401 при неверном пароле" do
    post "/login", params: { email: user.email, password: "wrong-password" }, as: :json

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body["error"]).to eq("invalid email or password")
    expect(user.reload.failed_login_count).to eq(1)
  end

  it "отзывает токен при logout" do
    post "/login", params: { email: user.email, password: "password123" }, as: :json
    token = response.parsed_body["api_token"]
    headers = auth_headers(token)

    delete "/logout", headers: headers

    expect(response).to have_http_status(:no_content)

    get "/predictions", headers: headers
    expect(response).to have_http_status(:unauthorized)
  end

  it "не пускает заблокированного пользователя" do
    user.update!(failed_login_count: 10, locked_until: 1.hour.from_now)

    post "/login", params: { email: user.email, password: "password123" }, as: :json

    expect(response).to have_http_status(:locked)
    expect(response.parsed_body["error"]).to eq("account locked, try later")
  end
end
