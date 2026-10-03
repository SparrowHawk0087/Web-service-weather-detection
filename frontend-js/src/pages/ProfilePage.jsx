import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProfile } from '../api/auth'
import { useAuth } from '../context/AuthContext'

function ProfilePage() {

    const { user, setUser, logout } = useAuth()
    const [error, setError] = useState('')
    const [checking, setChecking] = useState(!user)
    const navigate = useNavigate()

    useEffect(() => {

        if (user) return

        const load = async () => {
            try {
                const data = await getProfile()
                setUser(data)
            } catch (err) {
                console.log('>>> error getProfile:', err.response?.status, err.response?.data)
                if (err.response?.status == 401) {
                    // token is expired or wrong
                    await logout(true)
                    navigate('/login')
                } else {
                    setError("Couldn't upload profile")
                }
            } finally {
                setChecking(false)
            }
        }
        load()
    }, [user, setUser, logout, navigate])

    const handleLogout = async () => {
            await logout()
            navigate('/login')
    }

    if (checking) return <p>Checking...</p>;
    if (error) return <p>{error}</p>;
    if (!user) return <p>No data</p>;

    return(
        <div>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Nickname:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <button onClick={handleLogout}>Log out</button>
        </div>
    )
}

export default ProfilePage