import { Link } from  'react-router-dom'


function LoginPage() {
    return (
        <form>
            <h1>Enter</h1>
            <label>
                Email
                <input type="email" name="email" />
            </label>
            <label>
                Password
                <input type="password" name="password" />
            </label>
            <button type="submit">Login</button>
            <p>
                No account?<Link to="/register">Registration</Link>
            </p>
        </form>
    )
}

export default LoginPage