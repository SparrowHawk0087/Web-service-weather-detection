require "rails_helper"

RSpec.describe AuthToken, type: :model do
  include ActiveSupport::Testing::TimeHelpers

  let(:user) { create(:user) }

  describe ".issue" do
    it "возвращает raw-токен и сохраняет digest + prefix" do
      token, raw = described_class.issue(user: user, name: "CI")
      expect(raw).to start_with("wth_live_")
      expect(token.token_prefix).to eq(raw[0, described_class::PREFIX_VISIBLE])
      expect(token.token_digest).to eq(Digest::SHA256.hexdigest(raw))
      expect(token.token_digest).not_to eq(raw)
      expect(token).to be_active
    end

    it "каждый токен уникален" do
      _, raw1 = described_class.issue(user: user)
      _, raw2 = described_class.issue(user: user)
      expect(raw1).not_to eq(raw2)
    end
  end

  describe ".authenticate" do
    let!(:issued) { described_class.issue(user: user, name: "CI") }
    let(:raw)     { issued[1] }

    it "возвращает токен по корректному raw" do
      expect(described_class.authenticate(raw)).to eq(issued[0])
    end

    it "обновляет last_used_at" do
      freeze_time do
        described_class.authenticate(raw)
        expect(issued[0].reload.last_used_at).to eq(Time.current)
      end
    end

    it "возвращает nil для неверного raw" do
      expect(described_class.authenticate("nonsense")).to be_nil
    end

    it "возвращает nil для отозванного токена" do
      issued[0].revoke!
      expect(described_class.authenticate(raw)).to be_nil
    end

    it "возвращает nil для протухшего токена" do
      _, raw2 = described_class.issue(user: user, expires_at: 1.second.from_now)
      travel_to(2.seconds.from_now) do
        expect(described_class.authenticate(raw2)).to be_nil
      end
    end
  end

  describe "#revoke!" do
    it "делает токен неактивным" do
      token, _ = described_class.issue(user: user)
      token.revoke!
      expect(token).not_to be_active
      expect(token.revoked_at).to be_present
    end
  end
end