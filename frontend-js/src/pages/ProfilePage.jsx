import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProfilePage() {

    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    if (!user) return <p>No data</p>

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