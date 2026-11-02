require "rails_helper"
require "base64"

RSpec.describe "Sidekiq Web UI", type: :request do
  around do |example|
    previous_username = ENV["SIDEKIQ_WEB_USERNAME"]
    previous_password = ENV["SIDEKIQ_WEB_PASSWORD"]

    ENV["SIDEKIQ_WEB_USERNAME"] = "monitor"
    ENV["SIDEKIQ_WEB_PASSWORD"] = "test-only-password"

    example.run
  ensure
    previous_username.nil? ? ENV.delete("SIDEKIQ_WEB_USERNAME") : ENV["SIDEKIQ_WEB_USERNAME"] = previous_username
    previous_password.nil? ? ENV.delete("SIDEKIQ_WEB_PASSWORD") : ENV["SIDEKIQ_WEB_PASSWORD"] = previous_password
  end

  it "rejects requests without Basic Auth credentials" do
    get "/sidekiq/"

    expect(response).to have_http_status(:unauthorized)
    expect(response.headers["WWW-Authenticate"]).to include("Basic")
  end

  it "rejects requests when Sidekiq Web credentials are not configured" do
    ENV.delete("SIDEKIQ_WEB_USERNAME")
    ENV.delete("SIDEKIQ_WEB_PASSWORD")

    get "/sidekiq/", headers: { "Authorization" => basic_auth_header }

    expect(response).to have_http_status(:unauthorized)
  end

  it "allows access with the configured credentials" do
    get "/sidekiq/", headers: { "Authorization" => basic_auth_header }

    expect(response.status).to be_between(200, 399)
  end

  private

  def basic_auth_header
    credentials = Base64.strict_encode64("monitor:test-only-password")
    "Basic #{credentials}"
  end
end
