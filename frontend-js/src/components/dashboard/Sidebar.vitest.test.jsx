import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar.jsx'

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ user: { id: 7, name: 'Test User', email: 'test@example.com' } }),
}))
vi.mock('../../hooks/usePredictionImage', () => ({
  usePredictionImage: () => null,
}))

const record = {
  id: 42,
  name: 'Съезд на трассу',
  status: 'completed',
  weather_code: 'RAIN',
  weather_condition: 'Дождь',
  confidence: 0.91,
  probabilities: { RAIN: 0.91, FOG: 0.09 },
  image_url: null,
  image_content_type: null,
  ml_model_version: 'vision-v1',
  ml_service_version: '1.0',
  original_filename: 'road.jpg',
  processing_duration_ms: 120,
  error_code: null,
  is_favorite: false,
  low_confidence: false,
  created_at: '2026-11-23T10:00:00.000Z',
  updated_at: '2026-11-23T10:00:01.000Z',
}

function renderSidebar(overrides = {}) {
  const props = {
    history: [record],
    onNewAnalysis: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(true),
    onBulkDelete: vi.fn().mockResolvedValue(true),
    onRename: vi.fn().mockResolvedValue(true),
    onToggleFavorite: vi.fn().mockResolvedValue(true),
    onSelect: vi.fn(),
    onHistoryFiltersChange: vi.fn(),
    onLoadMore: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }

  return {
    ...render(<MemoryRouter><Sidebar {...props} /></MemoryRouter>),
    props,
  }
}

describe('History sidebar actions menu', () => {
  it('keeps the actions menu interactive after opening the three-dot button', async () => {
    const user = userEvent.setup()
    const { props } = renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Действия для Съезд на трассу' }))

    const menu = screen.getByRole('menu', { name: 'Действия для Съезд на трассу' })
    expect(menu).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Действия для Съезд на трассу' }).getAttribute('aria-expanded')).toBe('true')

    await user.click(within(menu).getByRole('menuitem', { name: 'Добавить в избранное' }))

    expect(props.onToggleFavorite).toHaveBeenCalledWith(record)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes the menu after clicking outside the sidebar', async () => {
    const user = userEvent.setup()
    renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Действия для Съезд на трассу' }))
    expect(screen.getByRole('menu')).toBeTruthy()

    await user.click(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('does not render redundant captions or history totals', () => {
    renderSidebar()

    expect(screen.queryByText('Рабочая область')).toBeNull()
    expect(screen.queryByText('Быстрые фильтры')).toBeNull()
    expect(screen.queryByText('Сортировка')).toBeNull()
    expect(screen.queryByText('1 из 1')).toBeNull()
    expect(screen.queryByText('42')).toBeNull()
  })
})
