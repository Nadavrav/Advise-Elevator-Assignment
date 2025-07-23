import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import styles from './AuthPage.module.css';

function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const switchModeHandler = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    showLoading();

    const url = isLoginMode
      ? `${process.env.REACT_APP_API_BASE_URL}/api/users/login`
      : `${process.env.REACT_APP_API_BASE_URL}/api/users/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data || 'An error occurred.');

      if (isLoginMode) {
        login(data.token);
        navigate('/dashboard');
      } else {
        alert('Registration successful! Please log in.');
        switchModeHandler();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      hideLoading(); 
    }
  };

  return (
    <div className={styles.authContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1>{isLoginMode ? 'Login' : 'Register'}</h1>
        
        <div className={styles.inputGroup}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        
        <button type="submit" className={styles.button}>
          {isLoginMode ? 'Login' : 'Create Account'}
        </button>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <button type="button" onClick={switchModeHandler} className={styles.switchButton}>
          Switch to {isLoginMode ? 'Register' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default AuthPage;