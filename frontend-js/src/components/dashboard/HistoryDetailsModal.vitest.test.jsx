import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HistoryDetailsModal from './HistoryDetailsModal.jsx'

function prediction(overrides = {}) {
  return {
    id: 101,
    name: 'Road scene',
    status: 'pending',
    weather_code: null,
    weather_condition: null,
    confidence: null,
    probabilities: {},
    image_url: null,
    image_content_type: null,
    ml_model_version: 'vision-v1',
    original_filename: 'road.jpg',
    error_code: null,
    created_at: '2026-11-22T10:00:00.000Z',
    updated_at: '2026-11-22T10:00:01.000Z',
    ...overrides,
  }
}

describe('HistoryDetailsModal', () => {
  it.each([
    ['pending', 'В очереди', 'Результат классификации появится после завершения обработки.'],
    ['processing', 'Обработка изображения', 'Результат классификации появится после завершения обработки.'],
    ['failed', 'Не удалось выполнить анализ', 'Попробуйте загрузить изображение ещё раз.'],
    ['cancelled', 'Анализ отменён', 'Результат классификации появится после завершения обработки.'],
  ])('renders the %s status without a classification result', (status, label, message) => {
    render(
      <HistoryDetailsModal
        isOpen
        onClose={() => {}}
        item={prediction({ status })}
      />,
    )

    expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
    expect(screen.queryByText('Вердикт модели')).toBeNull()
  })

  it('renders the completed classification and confidence', () => {
    render(
      <HistoryDetailsModal
        isOpen
        onClose={() => {}}
        item={prediction({
          status: 'completed',
          weather_code: 'SNOW',
          weather_condition: 'Снег',
          confidence: 0.92,
        })}
      />,
    )

    expect(screen.getByText('Вердикт модели')).toBeTruthy()
    expect(screen.getByText('Снег')).toBeTruthy()
    expect(screen.getByText('92.0%')).toBeTruthy()
  })

  it('keeps an unknown weather code visible instead of fabricating a label', () => {
    render(
      <HistoryDetailsModal
        isOpen
        onClose={() => {}}
        item={prediction({
          status: 'completed',
          weather_code: 'HAIL',
          weather_condition: 'HAIL',
          confidence: 0.5,
        })}
      />,
    )

    expect(screen.getByText('HAIL')).toBeTruthy()
    expect(screen.getByText('Рекомендации')).toBeTruthy()
  })

  it('shows the server error code for a failed prediction', () => {
    render(
      <HistoryDetailsModal
        isOpen
        onClose={() => {}}
        item={prediction({
          status: 'failed',
          error_code: 'INVALID_MODEL_RESULT',
        })}
      />,
    )

    expect(screen.getByText('Код ошибки: INVALID_MODEL_RESULT')).toBeTruthy()
  })

  it('renders nothing when the modal is closed or has no selected record', () => {
    const { container, rerender } = render(
      <HistoryDetailsModal isOpen={false} onClose={() => {}} item={prediction()} />,
    )

    expect(container.firstChild).toBeNull()

    rerender(<HistoryDetailsModal isOpen onClose={() => {}} item={null} />)
    expect(container.firstChild).toBeNull()
  })
})
