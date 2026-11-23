require "rails_helper"

RSpec.describe "Prediction images", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:storage_key) { "#{SecureRandom.uuid}.png" }
  let!(:prediction) do
    create(
      :prediction,
      user: user,
      storage_key: storage_key,
      original_filename: "road-scene.png"
    )
  end
  let(:headers) { auth_headers(token_for(user)) }

  before do
    FileUtils.mkdir_p(PredictionImageStorage::STORAGE_ROOT)
    File.binwrite(PredictionImageStorage.path_for(storage_key), "\x89PNG\r\n\x1A\n")
  end

  after do
    path = PredictionImageStorage.path_for(storage_key)
    File.delete(path) if File.file?(path)
  end

  it "serves an image to its owner" do
    get "/predictions/#{prediction.id}/image", headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("image/png")
    expect(response.headers["Content-Disposition"]).to include("inline")
  end

  it "does not expose another user's image" do
    foreign_prediction = create(
      :prediction,
      user: other_user,
      storage_key: storage_key,
      original_filename: "private.png"
    )

    get "/predictions/#{foreign_prediction.id}/image", headers: headers

    expect(response).to have_http_status(:not_found)
  end

  it "requires authentication" do
    get "/predictions/#{prediction.id}/image"

    expect(response).to have_http_status(:unauthorized)
  end
end
