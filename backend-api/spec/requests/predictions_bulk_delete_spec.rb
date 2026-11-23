require "rails_helper"

RSpec.describe "Bulk prediction deletion", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }

  it "soft-deletes all owned records and cancels pending work" do
    completed = create(:prediction, :completed, user: user)
    pending = create(:prediction, user: user, status: "pending")
    favorite = Favorite.create!(user: user, prediction: completed)
    dispatch = create(:prediction_dispatch, prediction: pending)
    feedback = create(:feedback, prediction: completed, user: user)

    delete "/predictions/bulk", params: { ids: [completed.id, pending.id] }, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("status" => "success", "deleted_count" => 2)
    expect(completed.reload.deleted_at).to be_present
    expect(pending.reload).to have_attributes(status: "cancelled")
    expect(pending.deleted_at).to be_present
    expect(Favorite.exists?(favorite.id)).to be(false)
    expect(Feedback.exists?(feedback.id)).to be(false)
    expect(PredictionDispatch.exists?(dispatch.id)).to be(false)
  end

  it "rejects a mixed selection containing another user's record without partial deletion" do
    own = create(:prediction, user: user)
    foreign = create(:prediction, user: other_user)

    delete "/predictions/bulk", params: { ids: [own.id, foreign.id] }, headers: headers

    expect(response).to have_http_status(:not_found)
    expect(own.reload.deleted_at).to be_nil
    expect(foreign.reload.deleted_at).to be_nil
  end

  it "rejects malformed, duplicate, and oversized selections" do
    delete "/predictions/bulk", params: { ids: ["not-an-id"] }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)

    record = create(:prediction, user: user)
    delete "/predictions/bulk", params: { ids: [record.id, record.id] }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)

    delete "/predictions/bulk", params: { ids: (1..101).to_a }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "requires authentication" do
    delete "/predictions/bulk", params: { ids: [1] }
    expect(response).to have_http_status(:unauthorized)
  end
end
