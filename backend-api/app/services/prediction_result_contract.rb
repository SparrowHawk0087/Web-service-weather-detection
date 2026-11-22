class PredictionResultContract
  PROBABILITY_SUM_TOLERANCE = 0.01
  FLOAT_EPSILON = 1e-9
  ERROR_CODE = "INVALID_MODEL_RESULT"

  class InvalidResult < StandardError
    attr_reader :error_code

    def initialize(message)
      super(message)
      @error_code = ERROR_CODE
    end
  end

  def initialize(result, weather_conditions: WeatherCondition.active)
    @result = result
    @weather_conditions = weather_conditions
  end

  def call
    prediction_data = required_value(@result, :prediction, "prediction")
    unless prediction_data.respond_to?(:key?)
      raise InvalidResult, "ML prediction payload must be an object"
    end

    weather_code = required_value(prediction_data, :class, "prediction.class")
                       .to_s.strip.upcase
    raise InvalidResult, "Predicted weather class is blank" if weather_code.blank?

    weather_condition = @weather_conditions.find_by(code: weather_code)
    raise InvalidResult, "Unknown or inactive weather class: #{weather_code}" unless weather_condition

    probabilities = normalize_probabilities(
      required_value(prediction_data, :probabilities, "prediction.probabilities")
    )
    validate_probability_sum!(probabilities)

    confidence = normalize_probability(
      required_value(prediction_data, :confidence, "prediction.confidence"),
      "prediction.confidence"
    )
    predicted_probability = probabilities[weather_code]

    if predicted_probability.nil?
      raise InvalidResult, "Predicted class #{weather_code} is missing from probabilities"
    end

    unless confidence == predicted_probability
      raise InvalidResult,
            "Confidence must equal the probability of the predicted class #{weather_code}"
    end

    {
      weather_condition: weather_condition,
      weather_code: weather_code,
      confidence: confidence,
      probabilities: probabilities
    }
  end

  alias validate! call

  private

  def required_value(hash, key, label)
    unless hash.respond_to?(:key?)
      raise InvalidResult, "ML response must be an object"
    end

    return hash[key] if hash.key?(key)
    return hash[key.to_s] if hash.key?(key.to_s)

    raise InvalidResult, "Missing required field: #{label}"
  end

  def normalize_probabilities(raw_probabilities)
    unless raw_probabilities.respond_to?(:each_pair) && raw_probabilities.any?
      raise InvalidResult, "prediction.probabilities must be a non-empty object"
    end

    raw_probabilities.each_pair.each_with_object({}) do |(raw_code, raw_value), normalized|
      code = raw_code.to_s.strip.upcase
      raise InvalidResult, "Probability class code must not be blank" if code.blank?
      if normalized.key?(code)
        raise InvalidResult, "Duplicate probability class after normalization: #{code}"
      end

      normalized[code] = normalize_probability(
        raw_value,
        "prediction.probabilities.#{raw_code}"
      )
    end
  end

  def normalize_probability(value, label)
    unless value.is_a?(Numeric) && !value.is_a?(Complex)
      raise InvalidResult, "#{label} must be a number"
    end

    normalized = value.to_f
    unless normalized.finite? && normalized.between?(0.0, 1.0)
      raise InvalidResult, "#{label} must be between 0 and 1"
    end

    normalized
  end

  def validate_probability_sum!(probabilities)
    total = probabilities.values.sum
    return if (total - 1.0).abs <= PROBABILITY_SUM_TOLERANCE + FLOAT_EPSILON

    raise InvalidResult,
          "Prediction probabilities must sum to 1 (actual sum: #{total.round(6)})"
  end
end
