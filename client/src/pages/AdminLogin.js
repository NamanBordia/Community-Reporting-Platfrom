import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting admin login...');
      
      const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response status:', response.status);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Check if Flask server is running.');
      }
      
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        // Store admin token and info
        localStorage.setItem('adminToken', data.access_token);
        localStorage.setItem('adminInfo', JSON.stringify(data.admin));
        
        // Also store as regular user for compatibility with existing routes
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify({
          ...data.admin,
          role: 'admin' // Add role for admin routes
        }));
        
        console.log('Admin login successful, navigating to admin dashboard...');
        console.log('Stored user data:', JSON.parse(localStorage.getItem('user')));
        
        // Force a page reload to ensure AuthContext is updated
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        setError('Cannot connect to server. Please make sure the Flask server is running on port 5000.');
      } else if (error.message.includes('non-JSON response')) {
        setError('Server error. Please check if Flask server is running and restart React development server.');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">CR</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Login
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAdminLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter admin username"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter admin password"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login as Admin'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full btn-secondary mt-2"
            >
              Back to User Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 