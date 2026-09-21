# CORS (Cross-Origin Resource Sharing) — allow the frontend from a DIFFERENT origin
# to access the API.

# rack-cors is middleware
# it intercepts OPTIONS preflight requests and adds
# Access-Control-Allow-* headers to responses.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allowed origins. "*" means any origin acceptable 
    origins "*"

    # Which resources and access rules we allow
    resource "*",
      headers: :any,                       # any headers (Authorization is needed!)
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      max_age: 600                         # cache preflight for 10 minutes
  end
end