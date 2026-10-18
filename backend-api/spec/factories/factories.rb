FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name     { "Test User" }
    password { "password123" }
    role     { "user" }

    trait :moderator { role { "moderator" } }
  end

  factory :weather_condition do
    sequence(:code) { |n| "CODE_#{n}" }
    min_confidence { 0.6 }
    active         { true }
    display_order  { 1 }
  end

  factory :prediction do
    user
    status { "pending" }
    association :weather_condition, factory: :weather_condition
    confidence { nil }
    image_checksum { SecureRandom.hex(32) }

    trait :completed do
      status { "completed" }
      confidence { 0.9 }
      weather_condition
    end

    trait :undefined_condition do
      status { "completed" }
      confidence { 0.4 }
      weather_condition { nil }
    end
  end

  factory :feedback do
    prediction
    user
    feedback_type { "wrong_class" }
    severity      { "normal" }
    status        { "new" }
  end
end