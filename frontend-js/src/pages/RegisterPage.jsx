function Register() {
    return (
        <form>
      <h1>Registration</h1>

      <label>
        Name
        <input type="text" name="name" />
      </label>

      <label>
        Email
        <input type="email" name="email" />
      </label>

      <label>
        Password
        <input type="password" name="password" />
      </label>

      <label>
        Repeat password
        <input type="password" name="password_confirmation" />
      </label>

      <button type="submit">Register</button>

      <p>
        Have an account? <a href="/login">Login</a>
      </p>
    </form>
    )
}

export default Register 


