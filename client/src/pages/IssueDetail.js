import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

// Fix default marker icon issue in Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const IssueDetail = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  const mapContainerStyle = {
    width: '100%',
    height: '300px'
  };

  useEffect(() => {
    if (issueId && issueId !== 'undefined') {
      fetchIssueDetails();
    } else {
      setLoading(false);
      toast.error('Invalid issue ID');
    }
  }, [issueId]);

  const fetchIssueDetails = async () => {
    if (!issueId || issueId === 'undefined') {
      setLoading(false);
      toast.error('Invalid issue ID');
      return;
    }

    try {
      setLoading(true);
      const [issueResponse, commentsResponse] = await Promise.all([
        api.get(`/issues/${issueId}`),
        api.get(`/comments/issues/${issueId}/comments`)
      ]);
      
      setIssue(issueResponse.data.issue);
      setComments(commentsResponse.data.comments || []);
    } catch (error) {
      console.error('Error fetching issue details:', error);
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to upvote');
      return;
    }

    try {
      setUpvoting(true);
      await api.post(`/issues/${issueId}/upvote`);
      setIssue(prev => ({
        ...prev,
        upvote_count: (prev.upvote_count || 0) + 1,
        has_upvoted: true
      }));
      toast.success('Issue upvoted!');
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote issue');
    } finally {
      setUpvoting(false);
    }
  };

  const handleRemoveUpvote = async () => {
    try {
      setUpvoting(true);
      await api.delete(`/issues/${issueId}/upvote`);
      setIssue(prev => ({
        ...prev,
        upvote_count: Math.max(0, (prev.upvote_count || 0) - 1),
        has_upvoted: false
      }));
      toast.success('Upvote removed');
    } catch (error) {
      console.error('Error removing upvote:', error);
      toast.error('Failed to remove upvote');
    } finally {
      setUpvoting(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await api.post(`/comments/issues/${issueId}/comments`, {
        content: newComment.trim()
      });
      
      setComments(prev => [response.data.comment, ...prev]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-gray-100 text-gray-800',
      'verified': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Image rendering helper
  const getImageSrc = (issue) => {
    const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    if (issue.image_url) {
      return issue.image_url.startsWith('http') ? issue.image_url : `${API_BASE}/uploads/${issue.image_url}`;
    }
    if (issue.image) {
      return issue.image.startsWith('http') ? issue.image : `${API_BASE}/uploads/${issue.image}`;
    }
    return null;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!issue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Issue Not Found</h1>
          <p className="text-gray-600 mb-4">The issue you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/issues')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Issues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{issue.title}</h1>
          <button
            onClick={() => navigate('/issues')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back to Issues
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.status)}`}>
            {issue.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(issue.priority)}`}>
            {issue.priority.toUpperCase()}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {issue.issue_type.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Description</h3>
                <p className="text-gray-600 mt-1">{issue.description}</p>
              </div>
              
              {issue.address && (
                <div>
                  <h3 className="font-medium text-gray-900">Address</h3>
                  <p className="text-gray-600 mt-1">{issue.address}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">Reported by</h3>
                  <p className="text-gray-600 mt-1">
                    {issue.reporter?.first_name} {issue.reporter?.last_name}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Reported on</h3>
                  <p className="text-gray-600 mt-1">{formatDate(issue.created_at)}</p>
                </div>
              </div>
              
              {issue.assigned_to && (
                <div>
                  <h3 className="font-medium text-gray-900">Assigned to</h3>
                  <p className="text-gray-600 mt-1">{issue.assigned_to}</p>
                </div>
              )}
              
              {issue.estimated_resolution_date && (
                <div>
                  <h3 className="font-medium text-gray-900">Estimated Resolution</h3>
                  <p className="text-gray-600 mt-1">{formatDate(issue.estimated_resolution_date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          {getImageSrc(issue) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Image</h2>
              <img
                src={getImageSrc(issue)}
                alt="Issue"
                className="w-full h-64 object-cover rounded-md"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src =
                    'data:image/svg+xml;utf8,<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="250" fill="%23cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23666">No Image</text></svg>';
                }}
              />
            </div>
          )}

          {/* Comments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>
            
            {/* Add Comment */}
            {isAuthenticated && (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {comment.author?.first_name} {comment.author?.last_name}
                        </span>
                        {comment.is_admin_comment && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-600 mt-2">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upvote Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Support this Issue</h2>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">{issue.upvote_count || 0}</div>
              <p className="text-gray-600 mb-4">people support this issue</p>
              
              {isAuthenticated ? (
                <button
                  onClick={issue.has_upvoted ? handleRemoveUpvote : handleUpvote}
                  disabled={upvoting}
                  className={`w-full px-4 py-2 rounded-md font-medium ${
                    issue.has_upvoted
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {upvoting ? 'Processing...' : (issue.has_upvoted ? 'Remove Support' : 'Support Issue')}
                </button>
              ) : (
                <p className="text-gray-500">Please log in to support this issue</p>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
            {issue.latitude && issue.longitude ? (
              <MapContainer
                center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                zoom={15}
                style={{ width: '100%', height: '300px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}>
                  <Popup>{issue.address || 'Issue Location'}</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="text-gray-500">No location data available.</div>
            )}
          </div>

          {/* Issue Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium">{issue.status.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Priority</span>
                <span className="font-medium">{issue.priority.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">{issue.issue_type.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supporters</span>
                <span className="font-medium">{issue.upvote_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Comments</span>
                <span className="font-medium">{comments.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail; 