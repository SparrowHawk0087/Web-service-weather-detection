# frozen_string_literal: true

module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      # POST /api/v1/signup
      def signup
        user = User.new(user_params)
        if user.save
          render json: {
            status: 'SUCCESS',
            message: 'User registered successfully',
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              api_token: user.api_token
            }
          }, status: :created
        else
          render json: {
            status: 'ERROR',
            message: 'Validation failed',
            errors: user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/login
      def login
        user = User.find_by(email: params[:email])
        if user && user.authenticate(params[:password])
          render json: {
            status: 'SUCCESS',
            message: 'Logged in successfully',
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              api_token: user.api_token
            }
          }, status: :ok
        else
          render json: {
            status: 'UNAUTHORIZED',
            message: 'Invalid email or password'
          }, status: :unauthorized
        end
      end

      # GET /api/v1/me
      def me
        token = request.headers['Authorization']&.split(' ')&.last
        user = User.find_by(api_token: token)
        if user
          render json: {
            status: 'SUCCESS',
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              api_token: user.api_token
            }
          }, status: :ok
        else
          render json: {
            status: 'UNAUTHORIZED',
            message: 'Unauthorized / Invalid Token'
          }, status: :unauthorized
        end
      end

      private

      def user_params
        params.permit(:name, :email, :password, :password_confirmation)
      end
    end
  end
end
