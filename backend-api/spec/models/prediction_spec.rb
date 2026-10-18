require "rails_helper"

RSpec.describe Prediction, type: :model do
  let(:user)       { create(:user) }
  let(:condition)  { create(:weather_condition, min_confidence: 0.6) }
  let(:prediction) { create(:prediction, user: user) }

  describe "state machine" do
    it "claim! переводит pending → processing" do
      expect(prediction.claim!).to be true
      expect(prediction.reload.status).to eq("processing")
      expect(prediction.started_at).to be_present
    end

    it "claim! возвращает false при повторном захвате" do
      expect(prediction.claim!).to be true
      expect(prediction.claim!).to be false
    end

    it "complete! переводит processing → completed с атрибутами" do
      prediction.claim!
      ok = prediction.complete!(
        weather_condition: condition,
        confidence: 0.92,
        class_probabilities: { "RAIN" => 0.92, "FOG" => 0.05, "SNOW" => 0.03 }
      )
      prediction.reload
      expect(ok).to be true
      expect(prediction.status).to eq("completed")
      expect(prediction.weather_condition).to eq(condition)
      expect(prediction.confidence).to be_within(0.001).of(0.92)
      expect(prediction.finished_at).to be_present
    end

    it "complete! не срабатывает из pending" do
      expect(
        prediction.complete!(weather_condition: condition, confidence: 0.9, class_probabilities: {})
      ).to be false
      expect(prediction.reload.status).to eq("pending")
    end

    it "fail! переводит processing → failed с кодом ошибки" do
      prediction.claim!
      expect(prediction.fail!(error_code: "ML_TIMEOUT")).to be true
      prediction.reload
      expect(prediction.status).to eq("failed")
      expect(prediction.error_code).to eq("ML_TIMEOUT")
      expect(prediction.finished_at).to be_present
    end

    it "fail! не срабатывает из completed" do
      prediction.claim!
      prediction.complete!(weather_condition: condition, confidence: 0.9, class_probabilities: {})
      expect(prediction.fail!(error_code: "X")).to be false
      expect(prediction.reload.status).to eq("completed")
    end
  end

  describe "low confidence / undefined" do
    it "#undefined? true только для completed без условия" do
      prediction.update!(status: "completed", confidence: 0.3, weather_condition: nil)
      expect(prediction).to be_undefined
    end

    it "#undefined? false, если условие есть" do
      prediction.update!(status: "completed", confidence: 0.9, weather_condition: condition)
      expect(prediction).not_to be_undefined
    end

    it "#low_confidence? сравнивает с min_confidence справочника" do
      prediction.update!(status: "completed", confidence: 0.4, weather_condition: condition)
      expect(prediction).to be_low_confidence
      prediction.update!(confidence: 0.7)
      expect(prediction).not_to be_low_confidence
    end

    it "#low_confidence? false без confidence или условия" do
      prediction.update!(status: "completed", confidence: nil, weather_condition: condition)
      expect(prediction).not_to be_low_confidence
    end
  end

  describe "idempotency and deduplication" do
    it "запрещает дубль (user_id, image_checksum)" do
      create(:prediction, user: user, image_checksum: "abc123")
      dup = build(:prediction, user: user, image_checksum: "abc123")
      expect { dup.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "разрешает тот же checksum у другого пользователя" do
      other = create(:user)
      create(:prediction, user: user,  image_checksum: "abc123")
      expect { create(:prediction, user: other, image_checksum: "abc123") }.not_to raise_error
    end

    it "запрещает дубль (user_id, idempotency_key)" do
      create(:prediction, user: user, idempotency_key: "req-1")
      dup = build(:prediction, user: user, idempotency_key: "req-1")
      expect { dup.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "разрешает несколько prediction с nil idempotency_key" do
      2.times { create(:prediction, user: user, idempotency_key: nil) }
      expect(user.predictions.where(idempotency_key: nil).count).to eq(2)
    end
  end
end