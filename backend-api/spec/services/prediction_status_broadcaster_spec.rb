require "rails_helper"

RSpec.describe PredictionStatusBroadcaster do
  let(:user) { create(:user, locale: "ru") }
  let(:prediction) { create(:prediction, user: user, status: "pending") }

  it "broadcasts the canonical serializer payload only to the owning user's stream" do
    expected_payload = PredictionSerializer.new(prediction, locale: "ru").as_json

    expect(ActionCable.server).to receive(:broadcast).with(
      "predictions:user:#{user.id}",
      {
        type: "prediction.updated",
        prediction: expected_payload
      }
    )

    described_class.broadcast(prediction)
  end
end
