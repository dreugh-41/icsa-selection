// src/components/Navigation.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Handle logout click - clears auth state and redirects to login
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper function to format role for display
  const formatRole = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Title and role */}
          <div className="flex items-center">
            <div className="text-xl font-bold">
              Sailing Nationals Selection
            </div>
            {user && (
              <div className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-sm">
                {formatRole(user.role)}
              </div>
            )}
          </div>

          {/* Right side - User info and logout */}
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.name} ({user.email})</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;