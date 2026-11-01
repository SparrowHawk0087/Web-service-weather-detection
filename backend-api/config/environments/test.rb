Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.action_dispatch.show_exceptions = :none
  config.active_support.deprecation = :stderr

  # Keep request/job specs isolated from the development Redis instance.
  config.active_job.queue_adapter = :test

  # RSpec request specs use www.example.com as their default host.
  config.hosts << "www.example.com"
end
