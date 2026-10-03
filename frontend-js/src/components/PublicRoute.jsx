import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PublicRoute({ children }) {
    const{ isAuthenticated,  loading } = useAuth()

    if (loading) {
        return <p>Loading...</p>
    }

    if (isAuthenticated) {
        return <Navigate to='/profile' replace />
    }

    return children
}