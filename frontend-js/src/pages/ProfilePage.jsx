import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import {
  clearPredictionHistory,
  deleteProfile,
  getProfile,
  getProfileStatistics,
  updatePassword,
  updateProfile,
} from '../api/profile.js'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ProfileCard from '../components/profile/ProfileCard.jsx'
import SecurityCard from '../components/profile/SecurityCard.jsx'
import PreferencesCard from '../components/profile/PreferencesCard.jsx'
import DangerZone from '../components/profile/DangerZone.jsx'
import StatisticsOverview from '../components/profile/StatisticsOverview.jsx'
import WeatherDistribution from '../components/profile/WeatherDistribution.jsx'
import ActivityHeatmap from '../components/profile/ActivityHeatmap.jsx'
import ConfidenceChart from '../components/profile/ConfidenceChart.jsx'

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [statistics, setStatistics] = useState(null)
  const [statisticsLoading, setStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [notice, setNotice] = useState(null)

  const loadStatistics = useCallback(async () => {
    try {
      const result = await getProfileStatistics()
      setStatistics(result)
      setStatisticsError('')
      return result
    } catch (error) {
      setStatisticsError(error.message || 'Не удалось загрузить статистику.')
      throw error
    } finally {
      setStatisticsLoading(false)
    }
  }, [])

  function retryStatistics() {
    setStatisticsLoading(true)
    loadStatistics().catch(() => {})
  }

  useEffect(() => {
    let active = true

    getProfile()
      .then((profile) => {
        if (!active) return
        setUser(profile)
        setProfileError('')
      })
      .catch((error) => {
        if (active) setProfileError(error.message || 'Не удалось загрузить профиль.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    getProfileStatistics()
      .then((result) => {
        if (!active) return
        setStatistics(result)
        setStatisticsError('')
      })
      .catch((error) => {
        if (active) setStatisticsError(error.message || 'Не удалось загрузить статистику.')
      })
      .finally(() => {
        if (active) setStatisticsLoading(false)
      })

    return () => {
      active = false
    }
  }, [setUser])

  async function handleProfileSave(payload) {
    setSavingProfile(true)
    setNotice(null)
    try {
      const updatedUser = await updateProfile(payload)
      setUser(updatedUser)
      setNotice({ type: 'success', text: 'Данные профиля сохранены.' })
      return updatedUser
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Не удалось обновить профиль.' })
      throw error
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordUpdate(payload) {
    setSavingPassword(true)
    setNotice(null)
    try {
      await updatePassword(payload)
      setNotice({ type: 'success', text: 'Пароль обновлён. Остальные активные сессии завершены.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Не удалось изменить пароль.' })
      throw error
    } finally {
      setSavingPassword(false)
    }
  }

  async function handlePreferenceChange(enabled) {
    setSavingPreferences(true)
    setNotice(null)
    try {
      const updatedUser = await updateProfile({
        settings: { animations_enabled: enabled },
      })
      setUser(updatedUser)
      setNotice({ type: 'success', text: 'Настройки интерфейса сохранены.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Не удалось сохранить настройки.' })
    } finally {
      setSavingPreferences(false)
    }
  }

  async function handleClearHistory() {
    setClearingHistory(true)
    setNotice(null)
    try {
      const result = await clearPredictionHistory()
      await loadStatistics().catch(() => null)
      setNotice({
        type: 'success',
        text: `История очищена. Удалено записей: ${result.deleted_count ?? 0}. Очистка изображений выполняется в фоне.`,
      })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Не удалось очистить историю.' })
      throw error
    } finally {
      setClearingHistory(false)
    }
  }

  async function handleDeleteAccount(payload) {
    setDeletingAccount(true)
    try {
      await deleteProfile(payload)
      await logout(true)
      navigate('/login', { replace: true })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Не удалось удалить аккаунт.' })
      throw error
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const profile = user || null
  const settings = profile?.settings || {}

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-[1440px]">
        <ProfileHeader user={profile} onLogout={handleLogout} />

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${notice.type === 'error' ? 'border-rose-300/20 bg-rose-500/10 text-rose-100' : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-current/60 hover:text-current" aria-label="Закрыть уведомление">×</button>
            </div>
          </div>
        )}

        {profileError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <span>{profileError}</span>
            <button type="button" onClick={() => {
              setProfileLoading(true)
              getProfile().then((data) => { setUser(data); setProfileError('') }).catch((error) => setProfileError(error.message)).finally(() => setProfileLoading(false))
            }} className="rounded-full border border-rose-200/20 px-3 py-1.5 text-xs hover:bg-rose-400/10">
              Повторить
            </button>
          </div>
        )}

        {statisticsError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/15 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
            <span>{statisticsError}</span>
            <button type="button" onClick={retryStatistics} className="rounded-full border border-amber-100/20 px-3 py-1.5 text-xs hover:bg-amber-300/10">
              Обновить статистику
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            {profileLoading && !profile ? (
              <div className="profile-glass-card h-[390px] animate-pulse bg-white/[0.035]" />
            ) : (
              <ProfileCard user={profile} onSave={handleProfileSave} saving={savingProfile} />
            )}

            <SecurityCard onUpdatePassword={handlePasswordUpdate} saving={savingPassword} />

            <PreferencesCard
              enabled={settings.animations_enabled !== false}
              onChange={handlePreferenceChange}
              saving={savingPreferences}
            />

          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <StatisticsOverview summary={statistics?.summary} loading={statisticsLoading} />

            <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
              <WeatherDistribution data={statistics?.class_distribution || []} loading={statisticsLoading} />
              <ActivityHeatmap data={statistics?.activity || []} loading={statisticsLoading} />
            </div>

            <ConfidenceChart
              activity={statistics?.activity || []}
              trend={statistics?.confidence_trend || []}
              loading={statisticsLoading}
            />
          </div>
        </div>

        <div className="mt-5">
          <DangerZone
            onClearHistory={handleClearHistory}
            onDeleteAccount={handleDeleteAccount}
            clearing={clearingHistory}
            deleting={deletingAccount}
          />
        </div>

        <footer className="mt-8 border-t border-white/[0.07] py-4 text-center text-[11px] text-white/30">
          FSR-WEATHER · Персональные данные и аналитика принадлежат только вашему аккаунту
        </footer>
      </div>
    </main>
  )
}
