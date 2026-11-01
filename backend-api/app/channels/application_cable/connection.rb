module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      raw_token = request.params["token"]
      auth_token = AuthToken.authenticate(raw_token)
      self.current_user = auth_token&.user
      reject_unauthorized_connection unless current_user&.active?
    end
  end
end
