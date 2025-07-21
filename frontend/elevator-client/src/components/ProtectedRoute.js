import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    // If there is no token, redirect the user to the login page
    return <Navigate to="/" replace />;
  }

  // If there is a token, render the child component (the protected page)
  return children;
};

export default ProtectedRoute;