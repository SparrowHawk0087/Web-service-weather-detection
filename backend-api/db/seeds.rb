conditions = {
  "RAIN" => { min_confidence: 0.6, display_order: 1, icon: "rain", color: "#3b82f6" },
  "FOG"  => { min_confidence: 0.55, display_order: 2, icon: "fog",  color: "#94a3b8" },
  "SNOW" => { min_confidence: 0.6, display_order: 3, icon: "snow", color: "#e0f2fe" }
}

conditions.each do |code, attrs|
  wc = WeatherCondition.find_or_initialize_by(code: code)
  wc.update!(
    min_confidence: attrs[:min_confidence],
    display_order:  attrs[:display_order],
    metadata:       { icon: attrs[:icon], color: attrs[:color] },
    active:         true
  )

  {
    "ru" => { name: russian_name(code), driver_recommendation: ru_tip(code) },
    "en" => { name: english_name(code), driver_recommendation: en_tip(code) }
  }.each do |locale, tr|
    wc.translations.find_or_initialize_by(locale: locale).update!(tr)
  end
end

def russian_name(code)
  { "RAIN" => "Дождь", "FOG" => "Туман", "SNOW" => "Снег" }[code]
end

def english_name(code)
  { "RAIN" => "Rain", "FOG" => "Fog", "SNOW" => "Snow" }[code]
end

def ru_tip(code)
  {
    "RAIN" => "Снизьте скорость, включите фары, увеличьте дистанцию.",
    "FOG"  => "Включите противотуманные фары, держитесь правой стороны.",
    "SNOW" => "Плавно тормозите, избегайте резких манёвров."
  }[code]
end

def en_tip(code)
  {
    "RAIN" => "Slow down, turn on headlights, increase following distance.",
    "FOG"  => "Use fog lights, keep to the right side of the road.",
    "SNOW" => "Brake gently, avoid sudden maneuvers."
  }[code]
end