import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook

function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { login } = useAuth(); // Get the login function from our context

  const switchModeHandler = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const url = isLoginMode
      ? 'http://localhost:5009/api/users/login'
      : 'http://localhost:5009/api/users/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data || 'An error occurred.');
      }

      if (isLoginMode) {
        // Use the context to save the token
        login(data.token);
        navigate('/dashboard');
      } else {
        alert('Registration successful! Please log in.');
        switchModeHandler();
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{isLoginMode ? 'Login' : 'Register'}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">{isLoginMode ? 'Login' : 'Create Account'}</button>
      </form>
      <button onClick={switchModeHandler}>
        Switch to {isLoginMode ? 'Register' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default AuthPage;