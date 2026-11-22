require "rails_helper"

RSpec.describe RecoverPredictionMediaCleanupJob, type: :job do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }

  it "recovers deleted prediction media that has not been enqueued" do
    prediction = create(
      :prediction,
      user: user,
      deleted_at: Time.current,
      storage_key: "#{SecureRandom.uuid}.jpg",
      media_cleanup_requested_at: nil
    )

    expect {
      described_class.perform_now
    }.to have_enqueued_job(DeletePredictionMediaJob).with([prediction.id])

    expect(prediction.reload.media_cleanup_requested_at).to be_present
  end

  it "does not enqueue a cleanup lease that is still fresh" do
    prediction = create(
      :prediction,
      user: user,
      deleted_at: Time.current,
      storage_key: "#{SecureRandom.uuid}.jpg",
      media_cleanup_requested_at: 1.minute.ago
    )

    expect {
      described_class.perform_now
    }.not_to have_enqueued_job(DeletePredictionMediaJob)

    expect(prediction.reload.media_cleanup_requested_at).to be_present
  end

  it "does not redispatch work that has already had its media removed" do
    create(
      :prediction,
      user: user,
      deleted_at: Time.current,
      storage_key: nil,
      heatmap_storage_key: nil,
      image_deleted_at: Time.current
    )

    expect {
      described_class.perform_now
    }.not_to have_enqueued_job(DeletePredictionMediaJob)
  end

  it "does not treat an explicitly empty prediction list as a global sweep" do
    create(
      :prediction,
      user: user,
      deleted_at: Time.current,
      storage_key: "#{SecureRandom.uuid}.jpg"
    )

    expect(PredictionMediaCleanupDispatchService.call([])).to eq(0)
    expect(enqueued_jobs).to be_empty
  end
end
