require "rails_helper"

RSpec.describe "Prediction favorites", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let!(:prediction) { create(:prediction, :completed, user: user) }
  let(:headers) { auth_headers(token_for(user)) }

  it "adds and removes a favorite idempotently" do
    put "/predictions/#{prediction.id}/favorite", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq("is_favorite" => true)
    expect(user.favorites.where(prediction: prediction).count).to eq(1)

    put "/predictions/#{prediction.id}/favorite", headers: headers
    expect(response).to have_http_status(:ok)
    expect(user.favorites.where(prediction: prediction).count).to eq(1)

    delete "/predictions/#{prediction.id}/favorite", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq("is_favorite" => false)
    expect(user.favorites.where(prediction: prediction).count).to eq(0)

    delete "/predictions/#{prediction.id}/favorite", headers: headers
    expect(response).to have_http_status(:ok)
    expect(user.favorites.where(prediction: prediction).count).to eq(0)
  end

  it "does not allow favoriting another user's prediction" do
    foreign_prediction = create(:prediction, :completed, user: other_user)

    put "/predictions/#{foreign_prediction.id}/favorite", headers: headers

    expect(response).to have_http_status(:not_found)
    expect(user.favorites.where(prediction: foreign_prediction)).to be_empty
  end

  it "requires authentication" do
    put "/predictions/#{prediction.id}/favorite"

    expect(response).to have_http_status(:unauthorized)
  end
end
