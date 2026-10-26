class ApplicationController < ActionController::API
  include ActionController::HttpAuthentication::Token::ControllerMethods

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Запись не найдена" }, status: :not_found
  end

  private

  def authenticate_request
    authenticate_or_request_with_http_token do |raw, _options|
      @current_token = AuthToken.authenticate(raw)
      @current_user  = @current_token&.user
      @current_user.present?
    end
  end

  def current_user
    @current_user
  end

  def current_token
    @current_token
  end
end
