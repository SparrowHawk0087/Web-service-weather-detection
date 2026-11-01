require "rails_helper"

RSpec.describe MlService::WeatherPredictionClient do
  describe "#multipart_body" do
    it "keeps binary image bytes in a binary multipart payload" do
      binary_image = "\x89PNG\r\n\x1A\n\xFF\x00".b

      body = described_class.new.send(
        :multipart_body,
        boundary: "test-boundary",
        filename: "изображение.png",
        content_type: "image/png",
        file_content: binary_image,
        model_id: "vision-v1"
      )

      expect(body.encoding).to eq(Encoding::BINARY)
      expect(body).to include(binary_image)
      expect(body).to include("filename=\"изображение.png\"".b)
      expect(body).to include("name=\"model_id\"".b)
    end
  end
end
