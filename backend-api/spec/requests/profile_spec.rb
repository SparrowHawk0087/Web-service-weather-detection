require "rails_helper"

RSpec.describe "Profile API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }

  describe "GET /profile" do
    it "returns the authenticated user's safe profile" do
      get "/profile", headers: headers

      expect(response).to have_http_status(:ok)
      profile = response.parsed_body.fetch("user")

      expect(profile).to include(
        "public_id" => user.public_id,
        "name" => user.name,
        "email" => user.email,
        "role" => user.role
      )
      expect(profile.dig("settings", "animations_enabled")).to be(true)
      expect(profile).to have_key("created_at")
      expect(profile).not_to have_key("password_digest")
    end

    it "requires authentication" do
      get "/profile"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PATCH /profile" do
    it "updates the name and persisted interface preferences" do
      patch "/profile",
            params: {
              user: {
                name: "New Profile Name",
                settings: { animations_enabled: false }
              }
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(user.reload.name).to eq("New Profile Name")
      expect(user.settings["animations_enabled"]).to be(false)
      expect(response.parsed_body.dig("user", "settings", "animations_enabled")).to be(false)
    end

    it "requires the current password when changing email" do
      patch "/profile",
            params: { user: { email: "changed@example.com" } },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body.dig("error", "code")).to eq("INVALID_CURRENT_PASSWORD")
      expect(user.reload.email).to eq("user1@example.com")
    end

    it "changes email when the current password is valid" do
      patch "/profile",
            params: {
              user: {
                email: "changed@example.com",
                current_password: "password123"
              }
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(user.reload.email).to eq("changed@example.com")
    end

    it "rejects an email that belongs to another user" do
      existing_user = create(:user, email: "taken@example.com")

      patch "/profile",
            params: {
              user: {
                email: existing_user.email,
                current_password: "password123"
              }
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body.dig("error", "code")).to eq("EMAIL_TAKEN")
    end

    it "rejects names shorter than three characters" do
      patch "/profile",
            params: { user: { name: "ab" } },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(user.reload.name).to eq("Test User")
    end

    it "does not permit role or public_id changes" do
      patch "/profile",
            params: {
              user: {
                name: "Safe Name",
                role: "admin",
                public_id: SecureRandom.uuid
              }
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(user.reload.role).to eq("user")
    end
  end

  describe "PATCH /profile/password" do
    it "updates the password and revokes other sessions but keeps the current token" do
      current_token, current_raw = AuthToken.issue(user: user, kind: "session")
      other_token, = AuthToken.issue(user: user, kind: "session")

      patch "/profile/password",
            params: {
              current_password: "password123",
              password: "newPassword123",
              password_confirmation: "newPassword123"
            },
            as: :json,
            headers: auth_headers(current_raw)

      expect(response).to have_http_status(:ok)
      expect(user.reload.authenticate("newPassword123")).to be_truthy
      expect(current_token.reload.active?).to be(true)
      expect(other_token.reload.revoked_at).to be_present
    end

    it "rejects an incorrect current password" do
      patch "/profile/password",
            params: {
              current_password: "incorrect",
              password: "newPassword123",
              password_confirmation: "newPassword123"
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body.dig("error", "code")).to eq("INVALID_CURRENT_PASSWORD")
    end

    it "rejects a password confirmation mismatch" do
      patch "/profile/password",
            params: {
              current_password: "password123",
              password: "newPassword123",
              password_confirmation: "differentPassword123"
            },
            as: :json,
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body.dig("error", "code")).to eq("PASSWORD_MISMATCH")
    end
  end

  describe "GET /profile/statistics" do
    it "returns an empty but complete statistics contract" do
      get "/profile/statistics", headers: headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body

      expect(body.fetch("summary")).to include(
        "total_analyses" => 0,
        "completed" => 0,
        "in_progress" => 0,
        "failed" => 0,
        "avg_confidence" => nil
      )
      expect(body.fetch("class_distribution").map { |item| item["code"] })
        .to eq(%w[FOG RAIN SNOW CLEAR UNKNOWN])
      expect(body.fetch("activity").size).to eq(84)
      expect(body.fetch("confidence_trend")).to eq([])
    end
  end
end
