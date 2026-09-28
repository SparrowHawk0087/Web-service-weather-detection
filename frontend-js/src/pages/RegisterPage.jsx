import { Link } from  'react-router-dom'
import { useState } from 'react'


function RegisterPage() {

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    })

    const setChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        })
    }

    console.log(form);

    return (
        <form>
      <h1>Registration</h1>

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


