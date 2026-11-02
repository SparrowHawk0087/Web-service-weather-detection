require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_cable/engine"

Bundler.require(*Rails.groups)

module BackendApi
  class Application < Rails::Application
    config.load_defaults 8.0
    config.api_only = true

    config.active_job.queue_adapter = :sidekiq

    # Sidekiq Web is mounted inside this API-only Rails app. Configure a
    # dedicated cookie session store for its CSRF protection; the middleware
    # is enabled only for the Sidekiq Web Rack application.
    config.session_store :cookie_store,
                         key: "_web_service_weather_detection_sidekiq_session"

    config.filter_parameters += %i[
      token
      api_token
      token_digest
      password
      password_confirmation
      email
    ]
  end
end
