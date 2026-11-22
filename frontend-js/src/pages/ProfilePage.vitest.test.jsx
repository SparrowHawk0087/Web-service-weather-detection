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
  activity: Array.from({ length: 84 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
    count: index === 83 ? 2 : 0,
  })),
  confidence_trend: [
    { date: '2026-11-21', avg_confidence: 0.8, sample_count: 1 },
    { date: '2026-11-23', avg_confidence: 0.9, sample_count: 2 },
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

  it('loads profile metrics and the reference-style class distribution', async () => {
    renderPage()

    expect(await screen.findByText('Обзор активности')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('87.0%')).toBeTruthy()
    expect(screen.getByText('Туман')).toBeTruthy()
    expect(screen.getByText('Ясно')).toBeTruthy()
    expect(screen.getByText('12 недель')).toBeTruthy()
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
