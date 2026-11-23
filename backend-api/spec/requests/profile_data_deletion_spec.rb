require "rails_helper"

RSpec.describe "Profile data deletion", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }

  describe "DELETE /predictions/clear" do
    it "hides only the current user's history and cancels queued analyses" do
      pending = create(:prediction, user: user, status: "pending")
      processing = create(:prediction, user: user, status: "processing")
      completed = create(:prediction, :completed, user: user)
      other_prediction = create(:prediction, user: create(:user), status: "pending")
      dispatch = create(:prediction_dispatch, prediction: pending)

      delete "/predictions/clear", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("status" => "success", "deleted_count" => 3)

      expect(pending.reload).to have_attributes(status: "cancelled")
      expect(processing.reload).to have_attributes(status: "cancelled")
      expect(completed.reload.deleted_at).to be_present
      expect(other_prediction.reload).to have_attributes(status: "pending", deleted_at: nil)
      expect { dispatch.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "is idempotent" do
      delete "/predictions/clear", headers: headers
      first_count = response.parsed_body.fetch("deleted_count")

      delete "/predictions/clear", headers: headers

      expect(response).to have_http_status(:ok)
      expect(first_count).to eq(0)
      expect(response.parsed_body.fetch("deleted_count")).to eq(0)
    end

    it "requires authentication" do
      delete "/predictions/clear"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /profile" do
    it "requires password and exact confirmation" do
      delete "/profile",
             params: { current_password: "password123", confirmation: "delete" },
             as: :json,
             headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(user.reload.anonymized_at).to be_nil
    end

    it "anonymizes the account and revokes all tokens" do
      prediction = create(:prediction, user: user, status: "pending")
      second_token, = AuthToken.issue(user: user, kind: "session")

      delete "/profile",
             params: { current_password: "password123", confirmation: "DELETE" },
             as: :json,
             headers: headers

      expect(response).to have_http_status(:no_content)
      expect(user.reload).to have_attributes(name: nil, email: nil)
      expect(user.anonymized_at).to be_present
      expect(user.auth_tokens.where(revoked_at: nil)).to be_empty
      expect(second_token.reload.revoked_at).to be_present
      expect(prediction.reload.status).to eq("cancelled")
      expect(prediction.deleted_at).to be_present
    end
  end
end
