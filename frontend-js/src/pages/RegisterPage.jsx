import { Link, useNavigate } from  'react-router-dom'
import { useState } from 'react'


function RegisterPage() {

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    })

    const [error, setError] = useState()
    const navigate = useNavigate()

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e) =>{
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

        console.log('Registration. Sended data: ', form);
        // temporary navigation route for testing the operation of handlers
        navigate('/login')
    }

    
    return (
        <form onSubmit={handleSubmit}>
            <h1>Registration</h1>

            {error && <p>{error}</p>}

            <label>
                Name
                <input 
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={setChange}
                />
            </label>

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

            <label>
                Repeat password
                <input 
                    type="password"
                    name="password_confirmation" 
                    value={form.password_confirmation}
                    onChange={setChange}
                />
            </label>

            <button type="submit">Register</button>

            <p>
                Have an account? <Link to="/login">Login</Link>
            </p>
        </form>
    )
}

export default RegisterPage


