require "rails_helper"

RSpec.describe RecoverPredictionDispatchesJob, type: :job do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:prediction) { create(:prediction, user: user, status: "pending") }
  let!(:dispatch) { PredictionDispatch.create!(prediction: prediction) }

  before do
    AnalyzePredictionJob.queue_adapter.enqueued_jobs.clear
  end

  it "enqueues an outbox record that was never attempted" do
    expect do
      described_class.perform_now
    end.to have_enqueued_job(AnalyzePredictionJob).with(prediction.id)

    expect(dispatch.reload.dispatched_at).to be_present
  end

  it "recovers an attempt that became stale before Redis accepted the job" do
    dispatch.update!(last_attempt_at: 2.minutes.ago, attempt_count: 1)

    expect do
      described_class.perform_now
    end.to have_enqueued_job(AnalyzePredictionJob).with(prediction.id)

    expect(dispatch.reload.dispatched_at).to be_present
    expect(dispatch.attempt_count).to eq(2)
  end

  it "does not retry a recent dispatch attempt" do
    dispatch.update!(last_attempt_at: 10.seconds.ago, attempt_count: 1)

    expect do
      described_class.perform_now
    end.not_to have_enqueued_job(AnalyzePredictionJob)

    expect(dispatch.reload.dispatched_at).to be_nil
    expect(dispatch.attempt_count).to eq(1)
  end
end
