require "rack/test"

module RequestHelpers
  def auth_headers(token)
    { "Authorization" => "Token token=#{token}" }
  end

  def token_for(user)
    _, raw = AuthToken.issue(user: user, kind: "session")
    raw
  end

  def upload_fixture(filename, content_type)
    Rack::Test::UploadedFile.new(
      Rails.root.join("spec/fixtures/files", filename),
      content_type
    )
  end

  def stub_ml_success(weather_class: "rain", confidence: 0.92, probabilities: nil)
    probabilities ||= {
      weather_class => confidence,
      "snow" => ((1.0 - confidence) / 2).round(2),
      "fog" => ((1.0 - confidence) / 2).round(2)
    }

    stub_request(:post, %r{/predict/?\z}).to_return(
      status: 200,
      headers: { "Content-Type" => "application/json" },
      body: {
        status: "success",
        prediction: {
          class: weather_class,
          confidence: confidence,
          probabilities: probabilities
        }
      }.to_json
    )
  end

  def stub_ml_error(status: 400, detail: "ML error")
    stub_request(:post, %r{/predict/?\z}).to_return(
      status: status,
      headers: { "Content-Type" => "application/json" },
      body: { detail: detail }.to_json
    )
  end

  def stub_ml_unavailable
    stub_request(:post, %r{/predict/?\z}).to_raise(Errno::ECONNREFUSED)
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
end
