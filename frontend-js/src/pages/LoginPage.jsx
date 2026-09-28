import { Link } from  'react-router-dom'
import { useState } from 'react'

function LoginPage() {

    const [form, setForm] = useState( {
        email: '',
        password: ''
        }
    ) 

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    console.log(form);

    return (
        <form>
            <h1>Enter</h1>
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