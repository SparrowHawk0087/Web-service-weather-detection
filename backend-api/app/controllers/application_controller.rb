class ApplicationController < ActionController::API
  include ActionController::HttpAuthentication::Token::ControllerMethods

  rescue_from ActiveRecord::RecordNotFound do
    render_api_error("RESOURCE_NOT_FOUND", "The requested resource was not found", status: :not_found)
  end

  private

  def authenticate_request
    authenticated = authenticate_with_http_token do |raw, _options|
      @current_token = AuthToken.authenticate(raw)
      @current_user = @current_token&.user
      @current_user.present?
    end

    return if authenticated

    render_api_error("UNAUTHORIZED", "Authentication is required", status: :unauthorized)
  end

  def render_api_error(code, message, details: {}, status:)
    render json: {
      error: {
        code: code,
        message: message,
        details: details
      }
    }, status: status
  end

  def current_user
    @current_user
  end

  def current_token
    @current_token
  end
end
