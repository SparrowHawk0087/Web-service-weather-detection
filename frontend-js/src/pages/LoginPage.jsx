import { Link, useNavigate } from  'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import MailIcon from '../components/icons/MailIcon'
import EyeIcon from '../components/icons/EyeIcon'
import EyeOffIcon from '../components/icons/EyeOffIcon'


function LoginPage() {

    const [form, setForm] = useState( {
        email: '',
        password: ''
        }
    ) 

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuth()    // take func login from context

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')    // reset the old error
        if (!form.email || !form.password) {
            setError('Fill all fields')
            return
        }

        setLoading(true)

        try {
            await login(form.email, form.password)
            navigate('/profile')
        } catch (err) {
            console.log('>>> login error: ', err.response?.status, err.response?.data)

            const raw = 
                err.response?.data?.errors ||
                err.response?.data?.error

            const message = Array.isArray(raw)
            ? raw.join(", ")
            : raw || "wrong email or password"

            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
      <h1 className="text-3xl font-bold text-white text-center mb-6">
        Welcome!
      </h1>

      {error && (
        <p className="mb-4 p-3 rounded bg-red-500/20 text-red-300 text-sm text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <input
            type="email"
            name="email"
            placeholder="email"
            value={form.email}
            onChange={setChange}
            className="liquid-glass-input
                w-full rounded-lg px-4 py-3 pr-12
                text-white placeholder-gray-300
                border border-white/40
                focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
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
            className="liquid-glass-input
                w-full rounded-lg px-4 py-3 pr-12
                text-white placeholder-gray-300
                border border-white/40
                focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Forgot password */}
        <div className="text-left">
          <a href="#" className="text-sm text-white/80 hover:text-white">
            Forgot password?
          </a>
        </div>

        {/* button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold text-lg hover:from-purple-600 hover:to-fuchsia-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Checking...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/80">
        No account?{' '}
        <Link to="/register" className="text-white hover:underline">
          Registration
        </Link>
      </p>
    </AuthLayout>
    )
}

export default LoginPage