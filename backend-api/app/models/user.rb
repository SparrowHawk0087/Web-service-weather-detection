class User < ApplicationRecord
  has_secure_password  # добавляет методы password/password_confirmation и authenticate

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true

  before_create :generate_api_token

  private

  def generate_api_token
    self.api_token = SecureRandom.hex(20)
  end
end