require "rails_helper"

RSpec.describe PredictionDispatchService do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:prediction) { create(:prediction, user: user, status: "pending") }
  let(:dispatch) { PredictionDispatch.create!(prediction: prediction) }

  before do
    AnalyzePredictionJob.queue_adapter.enqueued_jobs.clear
  end

  it "enqueues the analysis and records the successful dispatch" do
    expect do
      expect(described_class.call(dispatch.id)).to be(true)
    end.to have_enqueued_job(AnalyzePredictionJob).with(prediction.id)

    expect(dispatch.reload.dispatched_at).to be_present
    expect(dispatch.attempt_count).to eq(1)
    expect(dispatch.last_error).to be_nil
  end

  it "does not enqueue an already dispatched record again" do
    dispatch.update!(dispatched_at: Time.current)

    expect do
      expect(described_class.call(dispatch.id)).to be(false)
    end.not_to have_enqueued_job(AnalyzePredictionJob)
  end

  it "does not retry a recently attempted dispatch" do
    dispatch.update!(last_attempt_at: 10.seconds.ago)

    expect do
      expect(described_class.call(dispatch.id)).to be(false)
    end.not_to have_enqueued_job(AnalyzePredictionJob)

    expect(dispatch.reload.attempt_count).to eq(0)
  end

  it "keeps the outbox entry recoverable when Redis enqueue fails" do
    allow(AnalyzePredictionJob).to receive(:perform_later).and_raise(StandardError, "Redis unavailable")

    expect(described_class.call(dispatch.id)).to be(false)

    expect(dispatch.reload.dispatched_at).to be_nil
    expect(dispatch.attempt_count).to eq(1)
    expect(dispatch.last_error).to include("Redis unavailable")
  end

  it "treats a job rejected by Active Job as an unsuccessful dispatch" do
    allow(AnalyzePredictionJob).to receive(:perform_later).and_return(
      double(successfully_enqueued?: false)
    )

    expect(described_class.call(dispatch.id)).to be(false)

    expect(dispatch.reload.dispatched_at).to be_nil
    expect(dispatch.attempt_count).to eq(1)
    expect(dispatch.last_error).to include("did not enqueue")
  end
end
