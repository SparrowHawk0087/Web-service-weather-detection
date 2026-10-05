import { Link, useNavigate } from  'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import UserIcon from '../components/icons/UserIcon'
import MailIcon from '../components/icons/MailIcon'
import EyeIcon from '../components/icons/EyeIcon'
import EyeOffIcon from '../components/icons/EyeOffIcon'

function RegisterPage() {

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    })

    const [error, setError] = useState()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const navigate = useNavigate()
    const { register } = useAuth()      // take func register from context

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e) =>{
        e.preventDefault()
        setError('')    // reset the old error

        if (!form.name || !form.email || !form.password || !form.password_confirmation) {
            setError('Fill all fields')
            return
        }

        if (form.password != form.password_confirmation) {
            setError('Passwords are diffrent')
            return
        }

        if (form.password.length <= 6) {
            setError('Password should be more than 6 symbols')
            return
        }

        setLoading(true)

        try {
            await register(form)
            navigate('/dashboard')
        } catch (err) {
            const message = 
                err.response?.data?.errors?.join(', ') ||
                err.response?.data?.error ||
                "Failed to sign up"
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    
    const inputClass =
    'liquid-glass-input w-full rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-300 border border-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400';

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold text-white text-center mb-6">
        Sign Up
      </h1>

      {error && (
        <p className="mb-4 p-3 rounded bg-red-500/20 text-red-300 text-sm text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Username */}
        <div className="relative">
          <input
            type="text"
            name="name"
            placeholder="username"
            value={form.name}
            onChange={setChange}
            className={inputClass}
          />
          <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 w-5 h-5 pointer-events-none" />
        </div>

        {/* Email */}
        <div className="relative">
          <input
            type="email"
            name="email"
            placeholder="email"
            value={form.email}
            onChange={setChange}
            className={inputClass}
          />
          <MailIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 w-5 h-5 pointer-events-none" />
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="password"
            value={form.password}
            onChange={setChange}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Password confirmation */}
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            name="password_confirmation"
            placeholder="password_confirmation"
            value={form.password_confirmation}
            onChange={setChange}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Кнопка */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold text-lg hover:from-purple-600 hover:to-fuchsia-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Sending...' : 'Register'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/80">
        Have account?{' '}
        <Link to="/login" className="text-white hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default RegisterPage


