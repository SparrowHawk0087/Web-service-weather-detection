Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true

  # Permit dev-tunnel VS Code requests
  config.hosts << "j0gpg5mj-3000.euw.devtunnels.ms"
end
