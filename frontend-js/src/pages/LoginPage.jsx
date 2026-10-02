import { Link, useNavigate } from  'react-router-dom'
import { useState } from 'react'

function LoginPage() {

    const [form, setForm] = useState( {
        email: '',
        password: ''
        }
    ) 

    const [error, setError] = useState('')
    const navigate = useNavigate()

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')    // reset the old error
        if (!form.email || !form.password) {
            setError('Fill all fields')
            return
        }

        console.log(form);

        // temporary navigation route for testing the operation of handlers
        navigate('/register')
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
            <button type="submit">Login</button>
            <p>
                No account? <Link to="/register">Registration</Link>
            </p>
        </form>
    )
}

export default LoginPage