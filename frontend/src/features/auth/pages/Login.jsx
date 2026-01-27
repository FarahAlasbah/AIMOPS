// frontend/src/features/auth/pages/Login.jsx
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BarChart3, Megaphone, MessageSquare, TrendingUp, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';

import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/overview', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    setApiError('');
  };
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login({
        username: formData.username,
        password: formData.password
      });
      // Navigation is handled in AuthContext
    } catch (error) {
      console.error('Login error:', error);
      setApiError(error.message || error.detail || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <LayoutDashboard size={28} />
              </div>
              <h1 className="brand-name">AIMOPS</h1>
            </div>

            <p className="brand-tagline">
              AI-driven Marketing and Operations Predicting System
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <span className="feature-text">Demand Forecasting</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Megaphone size={20} />
                </div>
                <span className="feature-text">Campaign Management</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <MessageSquare size={20} />
                </div>
                <span className="feature-text">Feedback Analysis</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <span className="feature-text">Smart Insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {apiError && (
              <div className="alert alert-error">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Username Field */}
              <div className="form-field">
                <label htmlFor="username" className="field-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className={`field-input ${errors.username ? 'error' : ''}`}
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {errors.username && (
                  <span className="field-error">{errors.username}</span>
                )}
              </div>

              {/* Password Field */}
              <div className="form-field">
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className={`field-input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="field-error">{errors.password}</span>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-password-link" disabled={isLoading}>
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              

              {/* Sign Up Link */}
              
            </form>

            {/* Footer */}
            <div className="login-footer">
              <p>&copy; 2025 AIMOPS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
