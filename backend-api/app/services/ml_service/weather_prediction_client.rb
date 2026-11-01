require "net/http"
require "uri"
require "timeout"
require "socket"

module MlService
  class WeatherPredictionClient
    class Error < StandardError
      attr_reader :error_code

      def initialize(message, error_code:)
        super(message)
        @error_code = error_code
      end
    end

    class TransientError < Error; end
    class RejectedFileError < Error; end

    def call(storage_key:, original_filename:, model_id:)
      file_path = PredictionImageStorage.path_for(storage_key)
      unless File.file?(file_path)
        raise RejectedFileError.new("Файл изображения не найден", error_code: "IMAGE_NOT_FOUND")
      end

      uri = URI(ENV.fetch("ML_SERVICE_URL", "http://localhost:8000/predict"))
      boundary = "----RubyFormBoundary#{SecureRandom.hex(12)}"
      filename = File.basename(original_filename.presence || storage_key)

      body = multipart_body(
        boundary: boundary,
        filename: filename,
        content_type: content_type_for(storage_key),
        file_content: File.binread(file_path),
        model_id: model_id
      )

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 5
      http.read_timeout = 120
      http.write_timeout = 30 if http.respond_to?(:write_timeout=)

      request = Net::HTTP::Post.new(uri.request_uri)
      request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"
      request.body = body

      parse_response(http.request(request))
    rescue Net::OpenTimeout, Net::ReadTimeout, Timeout::Error,
           SocketError, Errno::ECONNREFUSED, Errno::ECONNRESET, EOFError => error
      raise TransientError.new(
        "ML-сервис временно недоступен: #{error.message}",
        error_code: "ML_SERVICE_UNAVAILABLE"
      )
    rescue JSON::ParserError => error
      raise TransientError.new(
        "ML-сервис вернул некорректный JSON: #{error.message}",
        error_code: "INVALID_ML_RESPONSE"
      )
    end

    private

    def multipart_body(boundary:, filename:, content_type:, file_content:, model_id:)
      safe_filename = filename.gsub(/["\r\n]/, "_")
      # Multipart payload contains arbitrary image bytes, so keep the whole
      # request body binary. Text headers retain their UTF-8 bytes via #b.
      body = String.new(encoding: Encoding::BINARY)
      body << "--#{boundary}\r\n".b
      body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{safe_filename}\"\r\n".b
      body << "Content-Type: #{content_type}\r\n\r\n".b
      body << file_content.b
      body << "\r\n--#{boundary}\r\n".b
      body << "Content-Disposition: form-data; name=\"model_id\"\r\n\r\n".b
      body << model_id.to_s.b
      body << "\r\n--#{boundary}--\r\n".b
      body
    end

    def content_type_for(storage_key)
      case File.extname(storage_key).downcase
      when ".jpg" then "image/jpeg"
      when ".png" then "image/png"
      when ".webp" then "image/webp"
      when ".zip" then "application/zip"
      else "application/octet-stream"
      end
    end

    def parse_response(response)
      parsed = JSON.parse(response.body, symbolize_names: true)
      return parsed if response.is_a?(Net::HTTPSuccess)

      details = parsed[:detail] || parsed[:error] || "Неизвестная ошибка ML-сервиса"
      message = details.is_a?(String) ? details : details.to_json

      if [400, 422].include?(response.code.to_i)
        raise RejectedFileError.new(message, error_code: "INVALID_IMAGE")
      end

      raise TransientError.new(message, error_code: "ML_SERVICE_ERROR")
    end
  end
end
