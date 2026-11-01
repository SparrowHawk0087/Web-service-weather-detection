require "rails_helper"

RSpec.describe "Predictions async", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(token_for(user)) }

  after do
    Prediction.where(user: user).find_each do |prediction|
      PredictionImageStorage.delete!(prediction.storage_key) if prediction.storage_key&.match?(/\A[0-9a-f-]{36}\./i)
    end
  end

  it "сохраняет изображение и ставит анализ в очередь" do
    enqueued_job = double(successfully_enqueued?: true)
    allow(AnalyzePredictionJob).to receive(:perform_later).and_return(enqueued_job)

    expect do
      post "/predictions/async",
           params: { file: upload_fixture("sample.png", "image/png"), model_id: "vision-v1" },
           headers: headers
    end.to change(Prediction, :count).by(1)

    expect(response).to have_http_status(:accepted)
    body = response.parsed_body
    expect(body["status"]).to eq("accepted")
    expect(body.dig("prediction", "status")).to eq("pending")

    prediction = Prediction.last
    expect(prediction.storage_key).to be_present
    expect(File).to exist(PredictionImageStorage.path_for(prediction.storage_key))
    expect(AnalyzePredictionJob).to have_received(:perform_later).with(prediction.id)
  end

  it "возвращает 400, если файл не передан" do
    post "/predictions/async", params: {}, headers: headers

    expect(response).to have_http_status(:bad_request)
  end

  it "отклоняет неподдерживаемый тип файла" do
    post "/predictions/async",
         params: { file: upload_fixture("sample.png", "text/plain") },
         headers: headers

    expect(response).to have_http_status(:unprocessable_content)
    expect(Prediction.where(user: user)).to be_empty
  end

  it "не позволяет получить чужой анализ" do
    foreign_prediction = create(:prediction, :completed, user: create(:user))

    get "/predictions/#{foreign_prediction.id}", headers: headers

    expect(response).to have_http_status(:not_found)
  end
end
