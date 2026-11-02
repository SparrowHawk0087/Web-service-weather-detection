Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true

  # Keep Action Cable origins in sync with the Rails API CORS allowlist.
  config.action_cable.allowed_request_origins = ENV.fetch(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
  ).split(",").map(&:strip).reject(&:empty?)

  # Permit dev-tunnel VS Code requests.
  config.hosts << "j0gpg5mj-3000.euw.devtunnels.ms"
end
