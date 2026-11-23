import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import * as profileApi from '../api/profile.js'
import ProfilePage from './ProfilePage.jsx'

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api/profile.js', () => ({
  clearPredictionHistory: vi.fn(),
  deleteProfile: vi.fn(),
  getProfile: vi.fn(),
  getProfileStatistics: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
}))

const user = {
  public_id: 'user-public-id',
  name: 'Kirill',
  email: 'kirill@example.com',
  role: 'user',
  locale: 'ru',
  timezone: 'Europe/Paris',
  settings: { animations_enabled: true },
  created_at: '2026-10-01T12:00:00Z',
}

const statistics = {
  summary: {
    total_analyses: 12,
    completed: 9,
    in_progress: 2,
    failed: 1,
    avg_confidence: 0.87,
  },
  class_distribution: [
    { code: 'FOG', label: 'Туман', count: 2, percentage: 22.22 },
    { code: 'RAIN', label: 'Дождь', count: 3, percentage: 33.33 },
    { code: 'SNOW', label: 'Снег', count: 3, percentage: 33.33 },
    { code: 'CLEAR', label: 'Ясно', count: 1, percentage: 11.11 },
    { code: 'UNKNOWN', label: 'Не определено', count: 0, percentage: 0 },
  ],
  activity_period: 'month',
  activity_offset: 0,
  activity_range: { start_date: '2026-11-01', end_date: '2026-11-30' },
  activity: Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10),
    count: index === 22 ? 2 : 0,
  })),
  confidence_activity: Array.from({ length: 84 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
    count: index === 83 ? 2 : 0,
  })),
  confidence_trend: [
    { date: '2026-11-21', avg_confidence: 0.8, sample_count: 1 },
    { date: '2026-11-23', avg_confidence: 0.9, sample_count: 2 },
  ],
  models: [
    { model_id: 'vision-v1', name: 'Weather Vision v1', avg_response_time_ms: 845, sample_count: 7, measured_count: 7 },
    { model_id: 'vision-v2', name: 'Weather Vision v2', avg_response_time_ms: null, sample_count: 0, measured_count: 0 },
    { model_id: 'storm-detector', name: 'Storm Detector', avg_response_time_ms: null, sample_count: 0, measured_count: 0 },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  const setUser = vi.fn()
  const logout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user, setUser, logout })
    profileApi.getProfile.mockResolvedValue(user)
    profileApi.getProfileStatistics.mockResolvedValue(statistics)
    profileApi.updateProfile.mockImplementation(async (payload) => ({
      ...user,
      ...payload,
      settings: { ...user.settings, ...payload.settings },
    }))
    profileApi.updatePassword.mockResolvedValue({ status: 'password_updated' })
    profileApi.clearPredictionHistory.mockResolvedValue({ status: 'success', deleted_count: 4 })
    profileApi.deleteProfile.mockResolvedValue(undefined)
    logout.mockResolvedValue(undefined)
  })

  it('loads account metrics, activity calendar, and measured model response times', async () => {
    renderPage()

    expect(await screen.findByText('Обзор активности')).toBeTruthy()
    expect(screen.getByText('12', { selector: '.profile-metric-card .profile-metric-value' })).toBeTruthy()
    expect(screen.getByText('87.0%')).toBeTruthy()
    expect(screen.getByText('Туман')).toBeTruthy()
    expect(screen.getByText('Ясно')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Месяц' })).toBeTruthy()
    expect(screen.getByText('Weather Vision v1')).toBeTruthy()
    expect(screen.getByText('~845 ms')).toBeTruthy()
  })

  it('saves account details and synchronizes AuthContext', async () => {
    renderPage()

    const nameInput = await screen.findByLabelText('Псевдоним')
    fireEvent.change(nameInput, { target: { value: 'Kirill New' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalledWith({ name: 'Kirill New' })
      expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kirill New' }))
    })
  })

  it('keeps the animation toggle fully inside its full-width settings row', async () => {
    renderPage()

    const toggle = await screen.findByRole('switch', { name: 'Анимации интерфейса' })
    const track = toggle.querySelector('.profile-switch-track')
    const thumb = track?.querySelector('.profile-switch-thumb')

    expect(toggle.className).toContain('profile-switch')
    expect(track).toBeTruthy()
    expect(thumb).toBeTruthy()
    expect(toggle.contains(track)).toBe(true)
    expect(track.contains(thumb)).toBe(true)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('persists animation preferences only after the API succeeds', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('switch', { name: 'Анимации интерфейса' }))

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalledWith({
        settings: { animations_enabled: false },
      })
      expect(setUser).toHaveBeenCalledWith(expect.objectContaining({
        settings: { animations_enabled: false },
      }))
    })
  })

  it('requests week, month and year activity with the selected offset', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Неделя' }))
    await waitFor(() => {
      expect(profileApi.getProfileStatistics).toHaveBeenLastCalledWith({
        activityPeriod: 'week',
        activityOffset: 0,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий период' }))
    await waitFor(() => {
      expect(profileApi.getProfileStatistics).toHaveBeenLastCalledWith({
        activityPeriod: 'week',
        activityOffset: -1,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Год' }))
    await waitFor(() => {
      expect(profileApi.getProfileStatistics).toHaveBeenLastCalledWith({
        activityPeriod: 'year',
        activityOffset: 0,
      })
    })
  })

  it('does not leave the activity calendar in a loading state when the current period is reselected', async () => {
    renderPage()

    const monthButton = await screen.findByRole('button', { name: 'Месяц' })
    fireEvent.click(monthButton)

    expect(profileApi.getProfileStatistics).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Следующий период' }).disabled).toBe(true)
  })

  it('places data actions inside the security card below a divider', async () => {
    renderPage()

    const heading = await screen.findByRole('heading', { name: 'Управление данными' })
    const securityCard = heading.closest('.profile-glass-card')

    expect(securityCard).toBeTruthy()
    expect(within(securityCard).getByRole('button', { name: 'Очистить историю' })).toBeTruthy()
    expect(within(securityCard).getByRole('button', { name: 'Удалить аккаунт' })).toBeTruthy()
    expect(securityCard.querySelector('.profile-security-divider')).toBeTruthy()
  })

  it('requires confirmation before clearing analysis history', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Очистить историю' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Очистить историю' }))

    await waitFor(() => {
      expect(profileApi.clearPredictionHistory).toHaveBeenCalledOnce()
      expect(profileApi.getProfileStatistics).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText(/Удалено записей: 4/)).toBeTruthy()
  })

  it('requires the password and DELETE word before account deletion', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить аккаунт' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Текущий пароль'), {
      target: { value: 'password123' },
    })
    fireEvent.change(within(dialog).getByLabelText('Введите DELETE для подтверждения'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Удалить аккаунт' }))

    await waitFor(() => {
      expect(profileApi.deleteProfile).toHaveBeenCalledWith({
        current_password: 'password123',
        confirmation: 'DELETE',
      })
      expect(logout).toHaveBeenCalledWith(true)
    })
  })
})
