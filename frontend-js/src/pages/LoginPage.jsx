import { Link, useNavigate } from  'react-router-dom'
import { useState } from 'react'
import { login } from '../api/auth'

function LoginPage() {

    const [form, setForm] = useState( {
        email: '',
        password: ''
        }
    ) 

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

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
            const data = await login(form.email, form.password)
            localStorage.setItem('token', data.token)
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
        <form onSubmit={handleSubmit}>
            <h1>Enter</h1>
            
            {error && <p>{error}</p>}

            <label>
                Email 
                <input 
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={setChange}
                />
            </label>
            <label>
                Password 
                <input 
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={setChange}
                />
            </label>
            <button type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Enter'}
            </button>
            <p>
                No account? <Link to="/register">Registration</Link>
            </p>
        </form>
    )
}

export default LoginPage