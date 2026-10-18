class UsersController < ApplicationController
  # POST /signup — открытый endpoint, аутентификация не требуется.
  def create
    user = User.new(user_params)

    if user.save
      # We issue an API token. raw is displayed once and is not stored in the database.
      token, raw = AuthToken.issue(
        user: user,
        kind: "api_key",
        name: "initial (signup)"
      )

      render json: {
        user: {
          public_id: user.public_id,
          name:      user.name,
          email:     user.email,
          role:      user.role
        },
        api_token:    raw,                 # is shown ONCE
        token_id:     token.id,
        token_prefix: token.token_prefix   # for display in the list of keys
      }, status: :created
    else
      render json: { errors: user.errors.full_messages },
             status: :unprocessable_entity
    end
  end

  private

  # Strong params: we only pass expected fields.
  # The user cannot forge id, role, api_token.
  def user_params
    params.expect(user: [:name, :email, :password, :password_confirmation])
  end
end