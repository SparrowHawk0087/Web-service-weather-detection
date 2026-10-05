import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import PublicRoute from './components/PublicRoute.jsx'
import './App.css'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage.jsx'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <Routes>
        <Route 
            path="/login"
            element={
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
            } 
        />
        <Route 
            path="/register"
            element={
                <PublicRoute>
                    <RegisterPage />
                </PublicRoute>
            } 
        />

        <Route 
            path="/dashboard"
            element={
                <PrivateRoute>
                    <DashboardPage />
                </PrivateRoute>
            }
        />

        <Route
            path="/profile"
            element={
                <PrivateRoute>
                    <ProfilePage />
                </PrivateRoute>
                
            }
        />
        
        <Route path="/about" element={<AboutPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App