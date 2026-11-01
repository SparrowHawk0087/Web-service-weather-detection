Rails.application.routes.draw do
  post   "/signup", to: "users#create"
  post   "/login",  to: "sessions#create"
  delete "/logout", to: "sessions#destroy"
  get    "/profile", to: "profile#show"

  resources :predictions, only: [:index, :show, :create, :update, :destroy] do
    collection do
      post :analyze
      post :async, action: :enqueue
    end
  end
end
