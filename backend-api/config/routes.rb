Rails.application.routes.draw do
  post   "/signup", to: "users#create"
  post   "/login",  to: "sessions#create"
  delete "/logout", to: "sessions#destroy"
  get    "/profile", to: "profile#show"

  mount ActionCable.server => "/cable"

  resources :predictions, only: [:index, :show, :create, :update, :destroy] do
    collection do
      post :analyze
    end
  end

  post "/predictions/async", to: "predictions#enqueue"
end
