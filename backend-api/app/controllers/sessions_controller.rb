class SessionsController < ApplicationController
  
  # Log in - opened (client doesn't have token yet)
  # Log out - only auth client
  
  # POST/login - endpoint
  def create
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      render json: { token: user.api_token,
                    user: { id: user.id, name: user.name, email: user.email } }
    else
      render json: { error: "Wrong password or email" }, status: :unauthorized
    end
  end

   # DELETE/logout - endpoint
   def destroy
     #  regenerate token - old is expired
     current_user.update!(api_token: SecureRandom.hex(20))
     head :no_content   # answer - only header
   end
end