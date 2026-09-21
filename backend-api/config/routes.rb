Rails.application.routes.draw do
  # Registry: opened POST-endpoint - Resourceful Routing
  # actions to session, not CRUD to resourse.
  post   "/signup",  to: "users#create"

  # Login: opened — client doesn't have token yet
  post   "/login",   to: "sessions#create"

  # Logout: closed — before_action :authenticate_request, only: :destroy
  delete "/logout",  to: "sessions#destroy"

  # Saved resourse: all closed
  get    "/profile", to: "profile#show"

end