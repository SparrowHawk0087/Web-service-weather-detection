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
