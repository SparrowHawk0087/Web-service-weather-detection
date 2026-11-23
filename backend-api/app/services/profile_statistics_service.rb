class ProfileStatisticsService
  WEATHER_CODES = %w[FOG RAIN SNOW CLEAR].freeze
  CONFIDENCE_DAYS = 84
  DEFAULT_ACTIVITY_PERIOD = "month"
  ACTIVITY_PERIODS = %w[week month year].freeze
  MAX_ACTIVITY_OFFSETS = { "week" => 104, "month" => 120, "year" => 20 }.freeze
  MODEL_CATALOG = {
    "vision-v1" => "Weather Vision v1",
    "vision-v2" => "Weather Vision v2",
    "storm-detector" => "Storm Detector"
  }.freeze

  def initialize(user, activity_period: nil, activity_offset: 0)
    @user = user
    timezone_name = user.timezone.presence || "UTC"
    @time_zone = ActiveSupport::TimeZone[timezone_name] || ActiveSupport::TimeZone["UTC"]
    @activity_period = normalize_activity_period(activity_period)
    @activity_offset = normalize_activity_offset(activity_offset)
  end

  def call
    {
      summary: summary,
      class_distribution: class_distribution,
      activity: activity,
      activity_period: activity_period,
      activity_offset: activity_offset,
      activity_range: activity_range,
      confidence_activity: confidence_activity,
      confidence_trend: confidence_trend,
      models: model_performance
    }
  end

  def activity_payload
    {
      activity: activity,
      activity_period: activity_period,
      activity_offset: activity_offset,
      activity_range: activity_range
    }
  end

  private

  attr_reader :user, :time_zone, :activity_period, :activity_offset

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

    distribution = WEATHER_CODES.map do |code|
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

    distribution << {
      code: "UNKNOWN",
      label: unknown_label,
      count: unknown_count,
      percentage: percentage(unknown_count, denominator)
    }
  end

  def activity
    start_date, end_date_exclusive, start_at, end_at = selected_activity_window
    expression = activity_date_expression

    counts = base_scope.where(created_at: start_at...end_at)
                       .group(Arel.sql(expression))
                       .count

    activity_dates.map do |date|
      { date: date.iso8601, count: counts.fetch(date, 0) }
    end
  end

  def activity_dates
    start_date, end_date_exclusive, = selected_activity_window

    if activity_period == "year"
      (0...12).map { |month| start_date.advance(months: month) }
    else
      (start_date...end_date_exclusive).to_a
    end
  end

  def selected_activity_window
    today = time_zone.today

    start_date, end_date_exclusive = case activity_period
                                     when "week"
                                       monday = today.beginning_of_week(:monday) + activity_offset.weeks
                                       [monday, monday + 7.days]
                                     when "year"
                                       year_start = Date.new(today.year + activity_offset, 1, 1)
                                       [year_start, year_start.next_year]
                                     else
                                       month_start = today.beginning_of_month.advance(months: activity_offset)
                                       [month_start, month_start.next_month]
                                     end

    [start_date, end_date_exclusive, zoned_start_of_day(start_date), zoned_start_of_day(end_date_exclusive)]
  end

  def activity_range
    start_date, end_date_exclusive, = selected_activity_window
    {
      start_date: start_date.iso8601,
      end_date: (end_date_exclusive - 1.day).iso8601
    }
  end

  def activity_date_expression
    return local_month_expression if activity_period == "year"

    local_date_expression
  end

  def local_date_expression
    Prediction.sanitize_sql_array(
      ["(predictions.created_at AT TIME ZONE ?)::date", time_zone.tzinfo.name]
    )
  end

  def local_month_expression
    Prediction.sanitize_sql_array(
      ["DATE_TRUNC('month', predictions.created_at AT TIME ZONE ?)::date", time_zone.tzinfo.name]
    )
  end

  def confidence_window
    today = time_zone.today
    start_date = today - (CONFIDENCE_DAYS - 1)
    end_date_exclusive = today + 1.day

    [
      start_date,
      end_date_exclusive,
      zoned_start_of_day(start_date),
      zoned_start_of_day(end_date_exclusive)
    ]
  end

  def confidence_activity
    start_date, end_date_exclusive, start_at, end_at = confidence_window
    counts = base_scope.where(created_at: start_at...end_at)
                       .group(Arel.sql(local_date_expression))
                       .count

    (start_date...end_date_exclusive).map do |date|
      { date: date.iso8601, count: counts.fetch(date, 0) }
    end
  end

  def confidence_trend
    _start_date, _end_date_exclusive, start_at, end_at = confidence_window
    rows = base_scope.where(status: "completed")
                     .where.not(confidence: nil)
                     .where(created_at: start_at...end_at)
                     .group(Arel.sql(local_date_expression))
                     .pluck(
                       Arel.sql(local_date_expression),
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

  def model_performance
    expression = "COALESCE(NULLIF(predictions.ml_model_version, ''), 'vision-v1')"
    rows = base_scope.where(status: "completed")
                     .group(Arel.sql(expression))
                     .pluck(
                       Arel.sql(expression),
                       Arel.sql("AVG(predictions.processing_duration_ms)"),
                       Arel.sql("COUNT(*)"),
                       Arel.sql("COUNT(predictions.processing_duration_ms)")
                     )

    statistics_by_model = rows.index_by(&:first)

    catalog = MODEL_CATALOG.map do |model_id, name|
      model_stats = statistics_by_model.delete(model_id)
      build_model_entry(
        model_id,
        name,
        model_stats&.fetch(1),
        model_stats&.fetch(2, 0) || 0,
        model_stats&.fetch(3, 0) || 0
      )
    end

    additional_models = statistics_by_model.map do |model_id, model_stats|
      build_model_entry(
        model_id,
        model_id.tr("_", " ").humanize,
        model_stats.fetch(1),
        model_stats.fetch(2),
        model_stats.fetch(3)
      )
    end

    catalog + additional_models
  end

  def build_model_entry(model_id, name, average, sample_count, measured_count)
    {
      model_id: model_id,
      name: name,
      avg_response_time_ms: average&.round,
      sample_count: sample_count,
      measured_count: measured_count
    }
  end

  def normalize_activity_period(value)
    period = value.to_s
    ACTIVITY_PERIODS.include?(period) ? period : DEFAULT_ACTIVITY_PERIOD
  end

  def normalize_activity_offset(value)
    offset = Integer(value.to_s, 10)
    offset.clamp(-MAX_ACTIVITY_OFFSETS.fetch(activity_period), 0)
  rescue ArgumentError, TypeError
    0
  end

  def zoned_start_of_day(date)
    time_zone.local(date.year, date.month, date.day)
  end

  def percentage(count, denominator)
    return 0.0 unless denominator.positive?

    (count.to_f * 100 / denominator).round(2)
  end

  def unknown_label
    default_label = locale.to_s.start_with?("en") ? "Unknown" : "Не определено"
    I18n.t("profile_statistics.unknown", locale: locale, default: default_label)
  end

  def locale
    user.locale.presence || "ru"
  end
end
