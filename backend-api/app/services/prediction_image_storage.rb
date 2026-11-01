require "fileutils"
require "tempfile"

class PredictionImageStorage
  class InvalidUpload < StandardError; end
  class MissingImage < StandardError; end

  MAX_FILE_SIZE = 25.megabytes

  CONTENT_TYPES = {
    "image/jpeg" => ".jpg",
    "image/png" => ".png",
    "image/webp" => ".webp",
    "application/zip" => ".zip",
    "application/x-zip-compressed" => ".zip"
  }.freeze

  STORAGE_ROOT = Rails.root.join("storage", "prediction_uploads")

  def self.store!(uploaded_file)
    extension = CONTENT_TYPES[uploaded_file.content_type]
    raise InvalidUpload, "Неподдерживаемый формат файла" unless extension

    if uploaded_file.size.zero? || uploaded_file.size > MAX_FILE_SIZE
      raise InvalidUpload, "Размер файла должен быть от 1 байта до 25 МБ"
    end

    FileUtils.mkdir_p(STORAGE_ROOT)
    storage_key = "#{SecureRandom.uuid}#{extension}"
    destination = path_for(storage_key)

    Tempfile.create([".prediction-upload-", extension], STORAGE_ROOT.to_s) do |temporary_file|
      temporary_file.binmode
      uploaded_file.tempfile.rewind
      IO.copy_stream(uploaded_file.tempfile, temporary_file)
      temporary_file.flush
      File.rename(temporary_file.path, destination)
    end

    storage_key
  rescue Errno::ENOSPC, Errno::EACCES => error
    raise InvalidUpload, "Не удалось сохранить изображение: #{error.message}"
  end

  def self.path_for(storage_key)
    unless storage_key.to_s.match?(/\A[0-9a-f-]{36}\.(jpg|png|webp|zip)\z/i)
      raise MissingImage, "Некорректный ключ изображения"
    end

    STORAGE_ROOT.join(storage_key)
  end

  def self.delete!(storage_key)
    path = path_for(storage_key)
    File.delete(path) if File.file?(path)
  end
end
