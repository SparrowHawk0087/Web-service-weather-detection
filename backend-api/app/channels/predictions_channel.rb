class PredictionsChannel < ApplicationCable::Channel
  def subscribed
    stream_from "predictions:user:#{current_user.id}"
  end
end
