import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingModal from './components/LoadingModal';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BuildingViewPage from './pages/BuildingViewPage';
import './App.css';

function GlobalLoadingIndicator() {
  const { isLoading } = useLoading();
  return isLoading ? <LoadingModal /> : null;
}

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <GlobalLoadingIndicator />
        <BrowserRouter>
          <div className="App">
            <Routes>
              {/* Public Route */}
              <Route path="/" element={<AuthPage />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/building/:id" 
                element={
                  <ProtectedRoute>
                    <BuildingViewPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </BrowserRouter>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;