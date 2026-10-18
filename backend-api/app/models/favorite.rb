class Favorite < ApplicationRecord
  belongs_to :user
  belongs_to :prediction

  validates :prediction_id, uniqueness: { scope: :user_id }
  validate  :prediction_belongs_to_user

  private

  def prediction_belongs_to_user
    return if user.nil? || prediction.nil?
    errors.add(:prediction, "должен принадлежать пользователю") if prediction.user_id != user_id
  end
end