Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true

  # Keep Action Cable origins in sync with the Rails API CORS allowlist.
  config.action_cable.allowed_request_origins = ENV.fetch(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
  ).split(",").map(&:strip).reject(&:empty?)

  # Permit requests forwarded by the Docker-based Vite proxy and GitHub Codespaces.
  # The leading dot allows the app.github.dev domain and its generated subdomains.
  config.hosts << "backend-api"
  config.hosts << ".app.github.dev"

  # Permit the existing dev-tunnel VS Code request.
  config.hosts << "j0gpg5mj-3000.euw.devtunnels.ms"
end
