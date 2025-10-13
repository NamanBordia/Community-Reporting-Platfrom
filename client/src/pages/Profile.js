import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { user, loading, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '' });
  const [editMode, setEditMode] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    // Basic validation
    if (!profile.first_name.trim() || !profile.last_name.trim() || !profile.email.trim()) {
      setProfileError('All fields are required.');
      setProfileLoading(false);
      return;
    }
    const result = await updateProfile(profile);
    if (result.success) {
      setProfileSuccess('Profile updated successfully!');
      setEditMode(false);
    } else {
      setProfileError(result.error || 'Failed to update profile.');
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    // Validation
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('All fields are required.');
      setPasswordLoading(false);
      return;
    }
    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      setPasswordLoading(false);
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordLoading(false);
      return;
    }
    const result = await changePassword({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password
    });
    if (result.success) {
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } else {
      setPasswordError(result.error || 'Failed to change password.');
    }
    setPasswordLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">User Profile</h1>
      {/* Profile Info */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
          {!editMode && (
            <button
              className="text-blue-600 hover:underline"
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          )}
        </div>
        <form onSubmit={handleProfileSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700">First Name</label>
              <input
                type="text"
                name="first_name"
                value={profile.first_name}
                onChange={handleProfileChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={!editMode}
              />
            </div>
            <div>
              <label className="block text-gray-700">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={profile.last_name}
                onChange={handleProfileChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={!editMode}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={!editMode}
              />
            </div>
          </div>
          {editMode && (
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => {
                  setEditMode(false);
                  setProfileError('');
                  setProfileSuccess('');
                  setProfile({
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    email: user.email || ''
                  });
                }}
                disabled={profileLoading}
              >
                Cancel
              </button>
            </div>
          )}
          {profileError && <div className="text-red-600 mt-2">{profileError}</div>}
          {profileSuccess && <div className="text-green-600 mt-2">{profileSuccess}</div>}
        </form>
      </div>
      {/* Password Change */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-700">Current Password</label>
              <input
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-gray-700">New Password</label>
              <input
                type="password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-gray-700">Confirm New Password</label>
              <input
                type="password"
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={passwordLoading}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
          {passwordError && <div className="text-red-600 mt-2">{passwordError}</div>}
          {passwordSuccess && <div className="text-green-600 mt-2">{passwordSuccess}</div>}
        </form>
      </div>
    </div>
  );
};

export default Profile; 