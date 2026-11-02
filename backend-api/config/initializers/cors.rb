# Keep browser access limited to explicitly configured frontend origins.
# The API uses Authorization headers, so credentialed cookies are not required.
allowed_origins = ENV.fetch(
  "CORS_ALLOWED_ORIGINS",
  "http://localhost:5173,http://127.0.0.1:5173"
).split(",").map(&:strip).reject(&:empty?)

raise "CORS_ALLOWED_ORIGINS must contain at least one origin" if allowed_origins.empty?

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      max_age: 600
  end
end
