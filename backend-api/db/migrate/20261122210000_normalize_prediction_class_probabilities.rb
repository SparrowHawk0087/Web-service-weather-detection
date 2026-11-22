class NormalizePredictionClassProbabilities < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      WITH normalized_entries AS (
        SELECT
          predictions.id,
          UPPER(probability.key) AS code,
          jsonb_agg(probability.value) -> -1 AS value
        FROM predictions
        CROSS JOIN LATERAL jsonb_each(predictions.class_probabilities) AS probability
        WHERE jsonb_typeof(predictions.class_probabilities) = 'object'
        GROUP BY predictions.id, UPPER(probability.key)
      ),
      normalized AS (
        SELECT
          id,
          jsonb_object_agg(code, value) AS probabilities
        FROM normalized_entries
        GROUP BY id
      )
      UPDATE predictions AS prediction
      SET class_probabilities = normalized.probabilities
      FROM normalized
      WHERE normalized.id = prediction.id
    SQL

    execute <<~SQL
      UPDATE predictions AS prediction
      SET class_probabilities = prediction.class_probabilities || COALESCE(
        (
          SELECT jsonb_object_agg(UPPER(weather_condition.code), '0'::jsonb)
          FROM weather_conditions AS weather_condition
          WHERE weather_condition.active = TRUE
            AND weather_condition.deleted_at IS NULL
            AND NOT (
              prediction.class_probabilities ? UPPER(weather_condition.code)
            )
        ),
        '{}'::jsonb
      )
      WHERE jsonb_typeof(prediction.class_probabilities) = 'object'
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "Prediction probability key normalization cannot be reversed safely"
  end
end
