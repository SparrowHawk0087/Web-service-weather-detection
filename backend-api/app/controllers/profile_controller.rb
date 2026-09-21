class ProfileController < ApplicationController
  
  # all controller is closed without valid token
  # gets 401 and action doesn't start
  before_action :authenticate_request

  # GET/profile
  def show
    render json: { id: current_user.id, name: current_user.name, email: current_user.email }
  end
end