require "rails_helper"

RSpec.describe PredictionsChannel, type: :channel do
  let(:user) { create(:user) }

  before do
    stub_connection current_user: user
  end

  it "subscribes to the authenticated user's prediction stream" do
    subscribe

    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("predictions:user:#{user.id}")
  end
end
