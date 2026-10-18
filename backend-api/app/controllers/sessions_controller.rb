class SessionsController < ApplicationController
  before_action :authenticate_request, only: :destroy

  def create
    payload = params[:user] || params
    email    = payload[:email].to_s.strip.downcase
    password = payload[:password].to_s

    user = User.find_by(email: email)

    unless user&.authenticate(password)
      user&.register_failed_login!
      return render json: { error: "invalid email or password" }, status: :unauthorized
    end

    if user.locked?
      return render json: { error: "account locked, try later" }, status: :locked
    end

    if user.anonymized? || user.deleted?
      return render json: { error: "invalid email or password" }, status: :unauthorized
    end

    user.register_successful_login!

    token, raw = AuthToken.issue(
      user:       user,
      kind:       "session",
      name:       "login #{Time.current.iso8601}",
      expires_at: 30.days.from_now
    )

    render json: {
      user:         { public_id: user.public_id, name: user.name, email: user.email, role: user.role },
      api_token:    raw,
      token_id:     token.id,
      token_prefix: token.token_prefix
    }, status: :created
  end

  def destroy
    current_token&.revoke!
    head :no_content
  end
end