# Runs as a small dedicated process, separate from web and Sidekiq workers.
# The DB row lock and retry window make overlapping scheduler processes safe.
class PredictionDispatchRecoveryScheduler
  INTERVAL = 60.seconds

  def self.run
    Rails.logger.info("[PredictionDispatchRecoveryScheduler] started")

    loop do
      begin
        RecoverPredictionDispatchesJob.perform_now
      rescue StandardError => error
        Rails.logger.error(
          "[PredictionDispatchRecoveryScheduler] #{error.class}: #{error.message}"
        )
      end

      sleep INTERVAL
    end
  end
end
