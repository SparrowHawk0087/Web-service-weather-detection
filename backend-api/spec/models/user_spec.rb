require "rails_helper"

RSpec.describe User, type: :model do
  include ActiveSupport::Testing::TimeHelpers

  describe "email normalization" do
    it "приводит email к нижнему регистру и обрезает пробелы" do
      user = build(:user, email: "  TEST@Example.COM  ")
      user.valid?
      expect(user.email).to eq("test@example.com")
    end
  end

  describe "#anonymize!" do
    let(:user)        { create(:user) }
    let!(:prediction) { create(:prediction, user: user, storage_key: "s3://x/img.jpg") }

    it "очищает PII и ставит anonymized_at" do
      user.anonymize!
      user.reload
      expect(user.email).to be_nil
      expect(user.name).to be_nil
      expect(user.password_digest).to be_nil
      expect(user.anonymized_at).to be_present
      expect(user).to be_anonymized
    end

    it "помечает предсказания удалёнными и стирает ключи к изображениям" do
      user.anonymize!
      prediction.reload
      expect(prediction.deleted_at).to be_present
      expect(prediction.storage_key).to be_nil
      expect(prediction.image_deleted_at).to be_present
    end
  end

  describe "lockout after failed logins" do
    let(:user) { create(:user) }

    before do
      stub_const("User::MAX_FAILED_LOGINS", 3)
      stub_const("User::LOCK_DURATION", 5.minutes)
    end

    it "не блокирует до достижения порога" do
      2.times { user.register_failed_login! }
      expect(user).not_to be_locked
      expect(user.failed_login_count).to eq(2)
    end

    it "блокирует после N неудачных попыток" do
      3.times { user.register_failed_login! }
      expect(user).to be_locked
      expect(user.locked_until).to be > Time.current
    end

    it "успешный логин сбрасывает счётчик и блокировку" do
      3.times { user.register_failed_login! }
      user.register_successful_login!
      user.reload
      expect(user.failed_login_count).to eq(0)
      expect(user.locked_until).to be_nil
      expect(user.sign_in_count).to eq(1)
      expect(user.last_sign_in_at).to be_present
    end

    it "блокировка истекает со временем" do
      3.times { user.register_failed_login! }
      expect(user).to be_locked
      travel_to(6.minutes.from_now) do
        expect(user).not_to be_locked
      end
    end
  end

  describe "password reset token (Rails 8.1 reset_token)" do
    let(:user) { create(:user) }

    it "генерирует токен и находит пользователя по нему" do
      token = user.generate_token_for(:password_reset)
      expect(User.find_by_token_for(:password_reset, token)).to eq(user)
    end

    it "токен инвалидируется после смены пароля" do
      token = user.generate_token_for(:password_reset)
      user.update!(password: "newpassword123")
      expect(User.find_by_token_for(:password_reset, token)).to be_nil
    end

    it "токен инвалидируется после истечения срока" do
      token = user.generate_token_for(:password_reset)
      travel_to(2.hours.from_now) do
        expect(User.find_by_token_for(:password_reset, token)).to be_nil
      end
    end
  end
end