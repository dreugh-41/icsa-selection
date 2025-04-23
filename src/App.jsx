// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';  // Add this import
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import Login from './pages/Auth/Login';
import SelectorDashboard from './pages/Selector/SelectorDashboard';
import ParliamentarianDashboard from './pages/Parliamentarian/ParliamentarianDashboard';
import Notification from './components/Notification';
import AdminDashboard from './pages/Admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <EventProvider>  {/* Add this wrapper */}
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/selector" 
              element={
                <ProtectedRoute allowedRoles={['selector']}>
                  <AuthenticatedLayout>
                    <SelectorDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/parliamentarian" 
              element={
                <ProtectedRoute allowedRoles={['parliamentarian']}>
                  <AuthenticatedLayout>
                    <ParliamentarianDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuthenticatedLayout>
                    <AdminDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/" 
              element={<Navigate to="/login" replace />} 
            />
          </Routes>
        </Router>
        <Notification/>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;