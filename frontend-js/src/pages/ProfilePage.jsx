import { useEffect, useState } from 'react'
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
import DangerZone from '../components/profile/DangerZone.jsx'
import StatisticsOverview from '../components/profile/StatisticsOverview.jsx'
import WeatherDistribution from '../components/profile/WeatherDistribution.jsx'
import ActivityHeatmap from '../components/profile/ActivityHeatmap.jsx'
import ConfidenceChart from '../components/profile/ConfidenceChart.jsx'
import ModelPerformance from '../components/profile/ModelPerformance.jsx'

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [statistics, setStatistics] = useState(null)
  const [statisticsLoading, setStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState('')
  const [activityPeriod, setActivityPeriod] = useState('month')
  const [activityOffset, setActivityOffset] = useState(0)
  const [activityLoading, setActivityLoading] = useState(false)
  const [statisticsRefresh, setStatisticsRefresh] = useState(0)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [notice, setNotice] = useState(null)

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

    return () => {
      active = false
    }
  }, [setUser])

  useEffect(() => {
    let active = true

    getProfileStatistics({
      activityPeriod,
      activityOffset,
    })
      .then((result) => {
        if (!active) return
        setStatistics(result)
        setStatisticsError('')
      })
      .catch((error) => {
        if (active) setStatisticsError(error.message || 'Не удалось загрузить статистику.')
      })
      .finally(() => {
        if (active) {
          setStatisticsLoading(false)
          setActivityLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [activityPeriod, activityOffset, statisticsRefresh])

  function retryProfile() {
    setProfileLoading(true)
    getProfile()
      .then((data) => {
        setUser(data)
        setProfileError('')
      })
      .catch((error) => setProfileError(error.message || 'Не удалось загрузить профиль.'))
      .finally(() => setProfileLoading(false))
  }

  function retryStatistics() {
    setStatisticsLoading(true)
    setStatisticsRefresh((current) => current + 1)
  }

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
      setStatisticsLoading(true)
      setActivityOffset(0)
      setStatisticsRefresh((current) => current + 1)
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

  function handleActivityPeriodChange(period) {
    if (period === activityPeriod && activityOffset === 0) return

    setActivityLoading(true)
    setActivityPeriod(period)
    setActivityOffset(0)
  }

  function handleActivityOffsetChange(offset) {
    if (offset === activityOffset) return

    setActivityLoading(true)
    setActivityOffset(offset)
  }

  const profile = user || null
  const settings = profile?.settings || {}

  return (
    <main className="profile-page">
      <div className="profile-container">
        <ProfileHeader onLogout={handleLogout} />

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`profile-notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть уведомление">×</button>
          </div>
        )}

        {profileError && (
          <div className="profile-inline-alert is-error">
            <span>{profileError}</span>
            <button type="button" onClick={retryProfile}>Повторить</button>
          </div>
        )}

        {statisticsError && (
          <div className="profile-inline-alert is-warning">
            <span>{statisticsError}</span>
            <button type="button" onClick={retryStatistics}>Обновить статистику</button>
          </div>
        )}

        <div className="profile-layout">
          <div className="profile-sidebar-column">
            {profileLoading && !profile ? (
              <div className="profile-glass-card profile-account-card profile-account-skeleton" />
            ) : (
              <ProfileCard
                user={profile}
                onSave={handleProfileSave}
                saving={savingProfile}
                animationsEnabled={settings.animations_enabled !== false}
                onPreferenceChange={handlePreferenceChange}
                savingPreferences={savingPreferences}
              />
            )}

            <SecurityCard onUpdatePassword={handlePasswordUpdate} saving={savingPassword}>
              <DangerZone
                onClearHistory={handleClearHistory}
                onDeleteAccount={handleDeleteAccount}
                clearing={clearingHistory}
                deleting={deletingAccount}
              />
            </SecurityCard>
          </div>

          <div className="profile-analytics-column">
            <StatisticsOverview summary={statistics?.summary} loading={statisticsLoading} />

            <div className="profile-chart-grid">
              <WeatherDistribution data={statistics?.class_distribution || []} loading={statisticsLoading} />
              <ActivityHeatmap
                data={statistics?.activity || []}
                range={statistics?.activity_range}
                period={activityPeriod}
                offset={activityOffset}
                loading={statisticsLoading}
                refreshing={activityLoading}
                onPeriodChange={handleActivityPeriodChange}
                onOffsetChange={handleActivityOffsetChange}
              />
            </div>

            <ConfidenceChart
              activity={statistics?.confidence_activity || []}
              trend={statistics?.confidence_trend || []}
              loading={statisticsLoading}
            />

            <ModelPerformance models={statistics?.models || []} loading={statisticsLoading} />
          </div>
        </div>
      </div>
    </main>
  )
}
