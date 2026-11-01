Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true

  # Permit the Vite development server to establish Action Cable connections.
  config.action_cable.allowed_request_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]

  # Permit dev-tunnel VS Code requests
  config.hosts << "j0gpg5mj-3000.euw.devtunnels.ms"
end
