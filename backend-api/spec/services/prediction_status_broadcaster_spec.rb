require "rails_helper"

RSpec.describe PredictionStatusBroadcaster do
  let(:user) { create(:user, locale: "ru") }
  let(:prediction) { create(:prediction, user: user, status: "pending") }

  it "broadcasts a status payload only to the owning user's stream" do
    expect(ActionCable.server).to receive(:broadcast).with(
      "predictions:user:#{user.id}",
      hash_including(
        type: "prediction.updated",
        prediction: hash_including(
          id: prediction.id,
          status: "pending"
        )
      )
    )

    described_class.broadcast(prediction)
  end
end
