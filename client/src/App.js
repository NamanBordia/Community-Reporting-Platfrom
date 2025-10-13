import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import IssueMap from './pages/IssueMap';
import ReportIssue from './pages/ReportIssue';
import IssueDetail from './pages/IssueDetail';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import LoadingSpinner from './components/LoadingSpinner';
import AdminLogin from './pages/AdminLogin';

function App() {
  const { user, loading } = useAuth();

  console.log('App render - user:', user, 'loading:', loading);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
            <Route path="/map" element={<IssueMap />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/report" element={user ? <ReportIssue /> : <Navigate to="/login" />} />
            <Route path="/issue/:issueId" element={<IssueDetail />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            
            {/* Admin routes */}
            <Route 
              path="/admin" 
              element={
                (() => {
                  console.log('Admin route check - user:', user, 'role:', user?.role);
                  return user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />;
                })()
              } 
            />
            <Route 
              path="/analytics" 
              element={user && user.role === 'admin' ? <Analytics /> : <Navigate to="/dashboard" />} 
            />
            
            {/* 404 route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App; 