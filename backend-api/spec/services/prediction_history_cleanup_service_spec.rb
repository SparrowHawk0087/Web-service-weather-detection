require "rails_helper"

RSpec.describe PredictionHistoryCleanupService do
  let(:user) { create(:user) }

  it "marks pending work as cancelled and hides related records without touching another user" do
    pending = create(:prediction, user: user, status: "pending")
    processing = create(:prediction, user: user, status: "processing")
    completed = create(:prediction, :completed, user: user)
    other = create(:prediction, user: create(:user), status: "pending")
    dispatch = create(:prediction_dispatch, prediction: pending)

    result = described_class.new(user).call

    expect(result).to eq(deleted_count: 3)
    expect(pending.reload.status).to eq("cancelled")
    expect(processing.reload.status).to eq("cancelled")
    expect(completed.reload.deleted_at).to be_present
    expect(other.reload.deleted_at).to be_nil
    expect { dispatch.reload }.to raise_error(ActiveRecord::RecordNotFound)
  end

  it "keeps storage keys until the asynchronous media deletion job succeeds" do
    key = "#{SecureRandom.uuid}.jpg"
    prediction = create(:prediction, user: user, storage_key: key)

    expect {
      described_class.new(user).call
    }.to have_enqueued_job(DeletePredictionMediaJob).with([prediction.id])

    expect(prediction.reload.storage_key).to eq(key)
    expect(prediction.deleted_at).to be_present
  end
end
