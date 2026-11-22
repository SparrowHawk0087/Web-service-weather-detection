import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function PublicRoute({ children }) {
    const{ isAuthenticated,  loading } = useAuth()

    if (loading) {
        return <p>Loading...</p>
    }

    if (isAuthenticated) {
        return <Navigate to='/dashboard' replace />
    }

    return children
}