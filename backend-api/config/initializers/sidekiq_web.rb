require "digest"
require "rack/auth/basic"
require "sidekiq/web"

Sidekiq::Web.configure do |config|
  # Sidekiq 8 uses a Rack middleware stack configured through this block.
  # Missing credentials fail closed: the mounted UI remains inaccessible.
  config.use Rack::Auth::Basic, "Restricted Sidekiq Web UI" do |username, password|
    expected_username = ENV["SIDEKIQ_WEB_USERNAME"].to_s
    expected_password = ENV["SIDEKIQ_WEB_PASSWORD"].to_s

    if expected_username.blank? || expected_password.blank?
      false
    else
      username_matches = Rack::Utils.secure_compare(
        Digest::SHA256.hexdigest(username.to_s),
        Digest::SHA256.hexdigest(expected_username)
      )
      password_matches = Rack::Utils.secure_compare(
        Digest::SHA256.hexdigest(password.to_s),
        Digest::SHA256.hexdigest(expected_password)
      )

      # Evaluate both comparisons to avoid short-circuit timing differences.
      username_matches & password_matches
    end
  end

  # Rails API-only apps do not enable cookie/session middleware globally.
  # Add it only to Sidekiq Web so its CSRF-protected forms can use a session.
  config.use ActionDispatch::Cookies
  config.use Rails.application.config.session_store,
             Rails.application.config.session_options
end
