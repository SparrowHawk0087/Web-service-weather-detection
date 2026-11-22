class ProfileController < ApplicationController
  before_action :authenticate_request

  # GET /profile
  def show
    render_profile
  end

  # PATCH /profile
  def update
    payload = profile_params
    attributes = {}

    attributes[:name] = payload[:name].to_s.strip if payload.key?(:name)

    if payload.key?(:email)
      requested_email = payload[:email].to_s.strip.downcase

      if requested_email != current_user.email
        unless current_user.authenticate(payload[:current_password].to_s)
          return render_api_error(
            "INVALID_CURRENT_PASSWORD",
            "The current password is incorrect",
            status: :unprocessable_entity
          )
        end
      end

      attributes[:email] = requested_email
    end

    if payload.key?(:settings)
      settings = current_user.settings.to_h.stringify_keys
      incoming_settings = payload[:settings].to_h

      if incoming_settings.key?("animations_enabled") || incoming_settings.key?(:animations_enabled)
        value = incoming_settings["animations_enabled"] || incoming_settings[:animations_enabled]
        unless [true, false, "true", "false"].include?(value)
          return render_api_error(
            "INVALID_SETTINGS",
            "The animations_enabled setting must be a boolean",
            status: :unprocessable_entity
          )
        end

        settings["animations_enabled"] = ActiveModel::Type::Boolean.new.cast(value)
      end

      attributes[:settings] = settings
    end

    if current_user.update(attributes)
      render_profile
    elsif current_user.errors.details[:email].any? { |error| error[:error] == :taken }
      render_api_error(
        "EMAIL_TAKEN",
        "An account with this email already exists",
        status: :conflict
      )
    else
      render_api_error(
        "PROFILE_INVALID",
        "The profile could not be updated",
        details: { errors: current_user.errors.full_messages },
        status: :unprocessable_entity
      )
    end
  end

  # PATCH /profile/password
  def update_password
    payload = params.permit(:current_password, :password, :password_confirmation)
    current_password = payload[:current_password].to_s
    new_password = payload[:password].to_s
    password_confirmation = payload[:password_confirmation].to_s

    unless current_user.authenticate(current_password)
      return render_api_error(
        "INVALID_CURRENT_PASSWORD",
        "The current password is incorrect",
        status: :unprocessable_entity
      )
    end

    if new_password.bytesize < 8 || new_password.bytesize > 72
      return render_api_error(
        "INVALID_PASSWORD",
        "The new password must contain between 8 and 72 bytes",
        status: :unprocessable_entity
      )
    end

    unless new_password == password_confirmation
      return render_api_error(
        "PASSWORD_MISMATCH",
        "The password confirmation does not match",
        status: :unprocessable_entity
      )
    end

    if current_user.authenticate(new_password)
      return render_api_error(
        "PASSWORD_UNCHANGED",
        "The new password must differ from the current password",
        status: :unprocessable_entity
      )
    end

    current_user.password = new_password
    current_user.password_confirmation = password_confirmation

    unless current_user.save
      return render_api_error(
        "INVALID_PASSWORD",
        "The password could not be updated",
        details: { errors: current_user.errors.full_messages },
        status: :unprocessable_entity
      )
    end

    current_user.auth_tokens.active
                .where(kind: "session")
                .where.not(id: current_token.id)
                .update_all(revoked_at: Time.current, updated_at: Time.current)

    render json: { status: "password_updated" }
  end

  # GET /profile/statistics
  def statistics
    render json: ProfileStatisticsService.new(current_user).call
  end

  private

  def profile_params
    params.require(:user).permit(
      :name,
      :email,
      :current_password,
      settings: [:animations_enabled]
    )
  end

  def render_profile
    render json: { user: ProfileSerializer.new(current_user).as_json }
  end
end
