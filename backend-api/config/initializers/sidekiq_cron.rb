require "sidekiq-cron"

Sidekiq::Cron.configure do |config|
  config.cron_poll_interval = 30
  config.cron_schedule_file = Rails.root.join("config/schedule.yml").to_s
end
