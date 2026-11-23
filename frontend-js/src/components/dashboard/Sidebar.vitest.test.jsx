import { render, screen, waitFor, within } from '@testing-library/react'
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
  it('shows a remove-from-favorites action for selected favorite records', async () => {
    const user = userEvent.setup()
    const favoriteRecord = { ...record, id: 43, name: 'Мост', is_favorite: true }
    const { props } = renderSidebar({ history: [favoriteRecord] })

    await user.click(screen.getByRole('checkbox', { name: 'Выбрать запись Мост' }))

    const removeButton = screen.getByRole('button', {
      name: 'Снять выбранные записи с избранного',
    })
    expect(removeButton).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Добавить выбранные записи в избранное' })).toBeNull()

    await user.click(removeButton)

    await waitFor(() => {
      expect(props.onToggleFavorite).toHaveBeenCalledWith(favoriteRecord)
    })
    expect(screen.getByRole('checkbox', { name: 'Выбрать запись Мост' }).checked).toBe(false)
  })

  it('shows both favorite actions for a mixed selection', async () => {
    const user = userEvent.setup()
    const favoriteRecord = { ...record, id: 43, name: 'Мост', is_favorite: true }
    renderSidebar({ history: [record, favoriteRecord] })

    await user.click(screen.getByRole('checkbox', { name: 'Выбрать запись Съезд на трассу' }))
    await user.click(screen.getByRole('checkbox', { name: 'Выбрать запись Мост' }))

    expect(screen.getByRole('button', {
      name: 'Добавить выбранные записи в избранное',
    })).toBeTruthy()
    expect(screen.getByRole('button', {
      name: 'Снять выбранные записи с избранного',
    })).toBeTruthy()
  })

  it('toggles the filter accordion from the full header row', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem('fsr-history-collapsed:7')
    renderSidebar()

    const accordion = screen.getByRole('button', {
      name: 'Фильтры. Текущий фильтр: Все',
    })
    expect(accordion.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('group', { name: 'Фильтры истории' })).toBeTruthy()

    await user.click(accordion)
    expect(accordion.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('group', { name: 'Фильтры истории' })).toBeNull()

    await user.click(accordion)
    expect(accordion.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('group', { name: 'Фильтры истории' })).toBeTruthy()
  })

  it('does not expose manual sorting as an available option', () => {
    renderSidebar()

    const sortSelect = screen.getByRole('combobox', { name: 'Сортировка истории' })
    expect(within(sortSelect).queryByRole('option', { name: 'Вручную (загруженные)' })).toBeNull()
  })

  it('centers the compact New Analysis action in collapsed mode', () => {
    window.localStorage.setItem('fsr-history-collapsed:7', 'true')
    const { unmount } = renderSidebar()

    const sidebar = document.querySelector('.history-sidebar')
    const newAnalysisButton = screen.getByRole('button', { name: 'Новый анализ' })

    expect(sidebar.classList.contains('is-collapsed')).toBe(true)

    const header = sidebar.querySelector('.history-sidebar-header')
    const actions = sidebar.querySelector('.history-sidebar-actions')
    expect(header.children[0].classList.contains('history-collapse-button')).toBe(true)
    expect(header.children[1].classList.contains('history-user-card')).toBe(true)
    expect(header.nextElementSibling).toBe(actions)
    expect(actions.querySelector('.history-new-button')).toBe(newAnalysisButton)

    expect(newAnalysisButton.title).toBe('Новый анализ')
    expect(newAnalysisButton.querySelector('.history-new-plus svg')).toBeTruthy()

    unmount()
    window.localStorage.removeItem('fsr-history-collapsed:7')
  })

})