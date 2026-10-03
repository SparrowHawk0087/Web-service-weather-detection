import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProfile, logout } from '../api/auth'

function ProfilePage() {

    const [profile, setProfile] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getProfile()
                setProfile(data)
            } catch (err) {
                console.log('>>> error getProfile:', err.response?.status, err.response?.data)
                if (err.response?.status == 401) {
                    // token is expired or wrong
                    localStorage.removeItem('token')
                    navigate('/login')
                } else {
                    setError("Couldn't upload profile")
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [navigate])

    const handleLogout = async () => {
        try {
            await logout()
        } catch(err) {
            console.log('>>> error logout:', err)
        } finally {
            localStorage.removeItem('token')
            navigate('/login')
        }
    }

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    if (!profile) return <p>No data</p>;

    return(
        <div>
            <p><strong>ID:</strong> {profile.id}</p>
            <p><strong>Nickname:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <button onClick={handleLogout}>Log out</button>
        </div>
    )
}

export default ProfilePage