function Login() {
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
                No account?<a href="/register">Registration</a>
            </p>
        </form>
    )
}

export default Login