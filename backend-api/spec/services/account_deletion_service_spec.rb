require "rails_helper"

RSpec.describe AccountDeletionService do
  let(:user) { create(:user) }

  it "anonymizes the user, revokes tokens and schedules media deletion" do
    key = "#{SecureRandom.uuid}.jpg"
    prediction = create(:prediction, user: user, status: "pending", storage_key: key)
    token, = AuthToken.issue(user: user, kind: "session")

    expect {
      described_class.new(user).call
    }.to have_enqueued_job(DeletePredictionMediaJob).with([prediction.id])

    expect(user.reload).to have_attributes(name: nil, email: nil, password_digest: nil)
    expect(user.anonymized_at).to be_present
    expect(token.reload.revoked_at).to be_present
    expect(prediction.reload).to have_attributes(status: "cancelled", storage_key: key)
    expect(prediction.deleted_at).to be_present
  end
end
