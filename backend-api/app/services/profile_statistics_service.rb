class ProfileStatisticsService
  WEATHER_CODES = %w[FOG RAIN SNOW CLEAR].freeze
  ACTIVITY_DAYS = 84

  def initialize(user)
    @user = user
    @time_zone = ActiveSupport::TimeZone[user.timezone.presence] ||
                 ActiveSupport::TimeZone["UTC"]
  end

  def call
    {
      summary: summary,
      class_distribution: class_distribution,
      activity: activity,
      confidence_trend: confidence_trend
    }
  end

  private

  attr_reader :user, :time_zone

  def base_scope
    user.predictions.where(deleted_at: nil, is_demo: false)
  end

  def summary
    status_counts = base_scope.group(:status).count
    completed_scope = base_scope.where(status: "completed")
    average_confidence = completed_scope.where.not(confidence: nil).average(:confidence)

    {
      total_analyses: status_counts.values.sum,
      completed: status_counts.fetch("completed", 0),
      in_progress: status_counts.fetch("pending", 0) + status_counts.fetch("processing", 0),
      failed: status_counts.fetch("failed", 0),
      avg_confidence: average_confidence&.to_f
    }
  end

  def class_distribution
    completed_scope = base_scope.where(status: "completed")
    counts_by_code = completed_scope.left_joins(:weather_condition)
                                    .group("weather_conditions.code")
                                    .count

    conditions = WeatherCondition.includes(:translations)
                                 .where(code: WEATHER_CODES)
                                 .index_by(&:code)

    known_counts = WEATHER_CODES.index_with { |code| counts_by_code.fetch(code, 0) }
    unknown_count = counts_by_code.sum do |code, count|
      WEATHER_CODES.include?(code) ? 0 : count
    end
    denominator = known_counts.values.sum + unknown_count

    known_classes = WEATHER_CODES.map do |code|
      condition = conditions[code]
      translations = condition&.translations&.to_a || []
      translation = translations.find { |item| item.locale == locale } || translations.first
      count = known_counts.fetch(code)

      {
        code: code,
        label: translation&.name.presence || code,
        count: count,
        percentage: percentage(count, denominator)
      }
    end

    known_classes << {
      code: "UNKNOWN",
      label: I18n.t("profile_statistics.unknown", locale: locale, default: "Не определено"),
      count: unknown_count,
      percentage: percentage(unknown_count, denominator)
    }
  end

  def activity
    start_date, start_at, end_at = activity_window
    date_expression = local_date_expression

    counts = base_scope.where(created_at: start_at...end_at)
                       .group(Arel.sql(date_expression))
                       .count

    (start_date..time_zone.today).map do |date|
      { date: date.iso8601, count: counts.fetch(date, 0) }
    end
  end

  def confidence_trend
    _start_date, start_at, end_at = activity_window
    date_expression = local_date_expression

    rows = base_scope.where(status: "completed")
                     .where.not(confidence: nil)
                     .where(created_at: start_at...end_at)
                     .group(Arel.sql(date_expression))
                     .pluck(
                       Arel.sql(date_expression),
                       Arel.sql("AVG(predictions.confidence)"),
                       Arel.sql("COUNT(*)")
                     )

    rows.sort_by(&:first).map do |date, average, sample_count|
      {
        date: date.iso8601,
        avg_confidence: average.to_f.round(4),
        sample_count: sample_count
      }
    end
  end

  def activity_window
    today = time_zone.today
    start_date = today - (ACTIVITY_DAYS - 1)
    start_at = time_zone.local(start_date.year, start_date.month, start_date.day)
    end_date = today + 1
    end_at = time_zone.local(end_date.year, end_date.month, end_date.day)

    [start_date, start_at, end_at]
  end

  def local_date_expression
    Prediction.sanitize_sql_array(
      ["(predictions.created_at AT TIME ZONE ?)::date", time_zone.tzinfo.name]
    )
  end

  def percentage(count, denominator)
    return 0.0 unless denominator.positive?

    (count.to_f * 100 / denominator).round(2)
  end

  def locale
    user.locale.presence || "ru"
  end
end
