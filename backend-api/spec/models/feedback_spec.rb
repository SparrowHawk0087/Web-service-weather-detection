require "rails_helper"

RSpec.describe Feedback, type: :model do
  let(:moderator) { create(:user, :moderator) }
  let(:feedback)  { create(:feedback, status: "new") }

  describe "status transitions" do
    it "new → triaged" do
      feedback.triage!(reviewer: moderator)
      expect(feedback.reload.status).to eq("triaged")
      expect(feedback.reviewer).to eq(moderator)
    end

    it "triaged → in_progress → resolved с заметкой" do
      feedback.triage!(reviewer: moderator)
      feedback.start_work!(reviewer: moderator)
      feedback.resolve!(reviewer: moderator, note: "модель переобучена")
      feedback.reload
      expect(feedback.status).to eq("resolved")
      expect(feedback.resolution_note).to eq("модель переобучена")
      expect(feedback.reviewed_at).to be_present
    end

    it "resolved → in_progress (reopen)" do
      feedback.triage!(reviewer: moderator)
      feedback.start_work!(reviewer: moderator)
      feedback.resolve!(reviewer: moderator)
      feedback.reopen!(reviewer: moderator)
      expect(feedback.reload.status).to eq("in_progress")
    end

    it "из new нельзя сразу в resolved" do
      expect { feedback.resolve!(reviewer: moderator) }.to raise_error(Feedback::InvalidTransition)
      expect(feedback.reload.status).to eq("new")
    end

    it "из wont_fix нельзя никуда" do
      feedback.triage!(reviewer: moderator)
      feedback.wont_fix!(reviewer: moderator)
      expect { feedback.resolve!(reviewer: moderator) }.to raise_error(Feedback::InvalidTransition)
    end
  end

  describe "валидации" do
    it "отклоняет неизвестный feedback_type" do
      expect(build(:feedback, feedback_type: "bogus")).not_to be_valid
    end

    it "отклоняет неизвестный статус" do
      expect(build(:feedback, status: "weird")).not_to be_valid
    end
  end
end