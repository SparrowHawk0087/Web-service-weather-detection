class ApplicationController < ActionController::API
  include ActionController::HttpAuthentification::Token::ControllerMethods

  private

  def authenticate_request 
    authenticate_or_request_with_http_token do |token, _options|
      @current_user = User.find_by(api_token: token)
    end
  end

  def current_user
    @current_user
  end
end