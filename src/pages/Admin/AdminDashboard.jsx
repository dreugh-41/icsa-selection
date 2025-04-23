// src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useEvent, EVENT_PHASES } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import SelectionLogs from '../../components/admin/SelectionLogs';

function AdminDashboard() {
  const { eventState, resetEventState } = useEvent();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [processes, setProcesses] = useState({
    open: { active: false, phase: null, teams: 0 },
    women: { active: false, phase: null, teams: 0 }
  });
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'selector',
    isActive: true
    });

    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserFormData, setNewUserFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      role: 'selector',
      password: 'password' // Default password
    });

  // Fetch users and process statuses on load
  useEffect(() => {
    // Load all users
    const allUsers = JSON.parse(localStorage.getItem('sailing_nationals_users') || '[]');
    setUsers(allUsers);

    // Check process status
    const currentState = localStorage.getItem('sailing_nationals_event_state');
    if (currentState) {
      const parsedState = JSON.parse(currentState);
      setProcesses({
        open: { 
          active: parsedState.selectionType === 'open', 
          phase: parsedState.selectionType === 'open' ? parsedState.phase : null,
          teams: parsedState.selectionType === 'open' ? parsedState.teams.length : 0
        },
        women: { 
          active: parsedState.selectionType === 'women', 
          phase: parsedState.selectionType === 'women' ? parsedState.phase : null,
          teams: parsedState.selectionType === 'women' ? parsedState.teams.length : 0
        }
      });
    }
  }, []);

  // Function to handle form changes
  const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setUserFormData({
        ...userFormData,
        [name]: type === 'checkbox' ? checked : value
      });
    };

  // Add this function to handle new user creation
  const handleCreateUser = () => {
    try {
      // Validate form data
      if (!newUserFormData.firstName || !newUserFormData.lastName || !newUserFormData.email) {
        alert('Please fill out all required fields');
        return;
      }

      // Create new user object
      const newUser = {
        id: `user_${Date.now()}`, // Generate a unique ID
        name: `${newUserFormData.firstName} ${newUserFormData.lastName}`,
        email: newUserFormData.email,
        password: newUserFormData.password,
        role: newUserFormData.role,
        isActive: true,
        votingHistory: {}
      };

      // Add to users list
      const updatedUsers = [...users, newUser];
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);

      // Reset form and hide it
      setNewUserFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'selector',
        password: 'password'
      });
      setShowNewUserForm(false);

      // Show success message
      alert(`User ${newUser.name} has been created successfully!`);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  // Add this function to handle form input changes
  const handleNewUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserFormData({
      ...newUserFormData,
      [name]: value
    });
  };
  
  // Function to update a user
  const updateUser = (userId) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, ...userFormData };
      }
      return user;
    });
    
    localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    setEditingUser(null);
  };
  
  // Function to reset user password (we'll set it to "password")
  const resetPassword = (userId) => {
    if (window.confirm('Are you sure you want to reset this user\'s password to "password"?')) {
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return { ...user, password: 'password' };
        }
        return user;
      });
      
      localStorage.setItem('sailing_nationals_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      alert('Password has been reset to "password".');
    }
  };
  
  // Function to start editing a user
  const startEditing = (user) => {
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setEditingUser(user.id);
  };

  // Helper function to get a readable phase name
  const getPhaseDisplay = (phase) => {
    const displays = {
      [EVENT_PHASES.PRESELECTION]: 'Preselection Phase',
      [EVENT_PHASES.ROUND1_AQ]: 'Round 1 - AQ Selection',
      [EVENT_PHASES.ROUND1_LOCK]: 'Round 1 - Lock Voting',
      [EVENT_PHASES.ROUND1_FINALIZED]: 'Round 1 Complete',
      [EVENT_PHASES.ROUND_LEFTOVER]: 'Leftover Voting',
      [EVENT_PHASES.ROUND_RANKING]: 'Team Ranking',
      [EVENT_PHASES.ROUND_FINALIZED]: 'Round Complete',
      [EVENT_PHASES.SEEDING]: 'Championship Seeding',
      [EVENT_PHASES.COMPLETED]: 'Process Completed',
    };
    return displays[phase] || 'Unknown Phase';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Welcome to the Sailing Nationals Selection System administration panel.
        </p>

        {/* Selection Process Status */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-3">Selection Process Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Open Selection */}
            <div className={`p-4 rounded-lg border ${processes.open.active ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Open Selection Process</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${processes.open.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {processes.open.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {processes.open.active ? (
                <div className="text-sm">
                  <p><span className="font-medium">Current Phase:</span> {getPhaseDisplay(processes.open.phase)}</p>
                  <p><span className="font-medium">Teams Loaded:</span> {processes.open.teams}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No active Open selection process.</p>
              )}
            </div>

            {/* Women's Selection */}
            <div className={`p-4 rounded-lg border ${processes.women.active ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Women's Selection Process</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${processes.women.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {processes.women.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {processes.women.active ? (
                <div className="text-sm">
                  <p><span className="font-medium">Current Phase:</span> {getPhaseDisplay(processes.women.phase)}</p>
                  <p><span className="font-medium">Teams Loaded:</span> {processes.women.teams}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No active Women's selection process.</p>
              )}
            </div>
          </div>
        </div>

        {/* New User Creation */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">User Management</h3>
            <button
              onClick={() => setShowNewUserForm(!showNewUserForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showNewUserForm ? 'Cancel' : 'Add New User'}
            </button>
          </div>

          {showNewUserForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-3">Create New User</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={newUserFormData.firstName}
                    onChange={handleNewUserInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={newUserFormData.lastName}
                    onChange={handleNewUserInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newUserFormData.email}
                    onChange={handleNewUserInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUserFormData.role}
                    onChange={handleNewUserInputChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="selector">Selector</option>
                    <option value="parliamentarian">Parliamentarian</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={newUserFormData.password}
                    onChange={handleNewUserInputChange}
                    className="w-full p-2 border rounded"
                    placeholder="Default: password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave as "password" or set a custom one
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create User
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Management */}
<div>
  <div className="border rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {users.map((user) => (
          <tr key={user.id}>
            {editingUser === user.id ? (
              // Editing Mode
              <>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    name="name"
                    value={userFormData.name}
                    onChange={handleInputChange}
                    className="border rounded px-2 py-1 w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="email"
                    name="email"
                    value={userFormData.email}
                    onChange={handleInputChange}
                    className="border rounded px-2 py-1 w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    name="role"
                    value={userFormData.role}
                    onChange={handleInputChange}
                    className="border rounded px-2 py-1"
                  >
                    <option value="selector">Selector</option>
                    <option value="parliamentarian">Parliamentarian</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={userFormData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm">Active</span>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => updateUser(user.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </td>
              </>
            ) : (
              // View Mode
              <>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'parliamentarian' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => startEditing(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => resetPassword(user.id)}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    Reset Password
                  </button>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  <div>
    <SelectionLogs />
  </div>
</div>
</div>
</div>
  );
}

export default AdminDashboard;