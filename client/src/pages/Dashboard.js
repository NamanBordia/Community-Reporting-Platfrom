import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { issuesAPI } from '../services/api';
import { FiPlus, FiMap, FiClock, FiCheckCircle, FiAlertCircle, FiEye } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    inProgress: 0,
    resolved: 0
  });

  useEffect(() => {
    fetchUserIssues();
  }, []);

  const fetchUserIssues = async () => {
    try {
      const response = await issuesAPI.getAll({ user_id: user.id, per_page: 5 });
      setIssues(response.data.issues);
      
      // Calculate stats
      const allIssues = await issuesAPI.getAll({ user_id: user.id, per_page: 100 });
      const userIssues = allIssues.data.issues;
      
      setStats({
        total: userIssues.length,
        submitted: userIssues.filter(issue => issue.status === 'submitted').length,
        inProgress: userIssues.filter(issue => ['verified', 'in_progress'].includes(issue.status)).length,
        resolved: userIssues.filter(issue => ['resolved', 'closed'].includes(issue.status)).length
      });
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <FiClock className="w-4 h-4 text-orange-500" />;
      case 'verified':
      case 'in_progress':
        return <FiAlertCircle className="w-4 h-4 text-blue-500" />;
      case 'resolved':
      case 'closed':
        return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <FiClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your reported issues
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/report"
          className="card hover:shadow-lg transition-shadow duration-200 group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors duration-200">
              <FiPlus className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Report New Issue</h3>
              <p className="text-gray-600">Submit a new community issue</p>
            </div>
          </div>
        </Link>

        <Link
          to="/map"
          className="card hover:shadow-lg transition-shadow duration-200 group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
              <FiMap className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">View Map</h3>
              <p className="text-gray-600">See all issues in your area</p>
            </div>
          </div>
        </Link>

        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FiEye className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Total Reports</h3>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiClock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiAlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Issues */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Issues</h2>
          <Link
            to="/map"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {issues.length === 0 ? (
          <div className="text-center py-8">
            <FiPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues reported yet</h3>
            <p className="text-gray-600 mb-4">
              Start by reporting your first community issue
            </p>
            <Link
              to="/report"
              className="btn-primary"
            >
              Report Your First Issue
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(issue.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{issue.title}</h3>
                      <p className="text-sm text-gray-600">
                        {issue.issue_type.replace('_', ' ')} • {formatDate(issue.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge status-${issue.status}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/issue/${issue.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <FiEye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 