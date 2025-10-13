import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
    fetchAllIssues();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      // Fetch overview stats
      const statsResponse = await fetch(`${API_BASE}/api/analytics/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.overview);
      }

      // Fetch recent issues
      const issuesResponse = await fetch(`${API_BASE}/api/issues?page=1&per_page=5&status=all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        setRecentIssues(issuesData.issues || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllIssues = async (page = 1, status = 'all') => {
    try {
      setIssuesLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      const url = `${API_BASE}/api/issues?page=${page}&per_page=10${status !== 'all' ? `&status=${status}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllIssues(data.issues || []);
        setTotalPages(data.pagination?.pages || 1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setIssuesLoading(false);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/issues/${issueId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast.success(`Issue status updated to ${newStatus}`);
        // Refresh issues list
        fetchAllIssues(currentPage, statusFilter);
        fetchDashboardData(); // Refresh stats
        setShowIssueModal(false);
        setSelectedIssue(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update issue status');
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast.error('Failed to update issue status');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-yellow-100 text-yellow-800',
      'verified': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const openIssueModal = (issue) => {
    setSelectedIssue(issue);
    setShowIssueModal(true);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    fetchAllIssues(1, status);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.username || 'Admin'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/analytics"
                className="btn-primary"
              >
                View Analytics
              </Link>
              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Issues</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_issues}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Comments</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_comments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.resolution_rate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Issue Management Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Issue Management</h2>
              <div className="flex space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
          
          {issuesLoading ? (
            <div className="p-6 text-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                          <div className="text-sm text-gray-500">{issue.issue_type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {issue.reporter?.first_name} {issue.reporter?.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openIssueModal(issue)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchAllIssues(currentPage - 1, statusFilter)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchAllIssues(currentPage + 1, statusFilter)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/map"
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                View Issue Map
              </Link>
              <Link
                to="/analytics"
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                View Analytics
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Server</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Service</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900">New issue reported</div>
                <div className="text-xs text-gray-500">2 minutes ago</div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900">Issue resolved</div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900">New user registered</div>
                <div className="text-xs text-gray-500">3 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Management Modal */}
      {showIssueModal && selectedIssue && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Issue</h3>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">{selectedIssue.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedIssue.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Type: {selectedIssue.issue_type}</p>
                  <p>Priority: {selectedIssue.priority}</p>
                  <p>Reporter: {selectedIssue.reporter?.first_name} {selectedIssue.reporter?.last_name}</p>
                  <p>Created: {new Date(selectedIssue.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Status
                </label>
                <select
                  defaultValue={selectedIssue.status}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  onChange={(e) => updateIssueStatus(selectedIssue.id, e.target.value)}
                >
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowIssueModal(false);
                    setSelectedIssue(null);
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 