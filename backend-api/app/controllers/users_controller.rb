class UsersController < ApplicationController
  
  # POST/signup - open endpoind, without auth
  # signup is permitted for everyone includes anonym-client
  def create
    user = User.new(user_params)

    if user.save
      render json: { id: user.id, name: user.name,
                    email: user.email, token: user.api_token },
             status: :created
    else 
      render json: { errors: user.errors.full_messages }, 
            status: :unprocessable_entity
    end
  end

  
  private

  # Strong params:
  # pass only expected params 
  # user can't forge token or id
  def user_params
    params.expect(user: [:name, :email, :password, :password_confirmation])
  end
end