import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    // Only handle auth errors if we have a response
    if (error.response) {
      const { status } = error.response;
      const isAuthEndpoint = error.config.url.includes('/auth/');
      
      // Handle authentication errors
      if (status === 401 && !isAuthEndpoint) {
        const token = localStorage.getItem('token');
        if (token) {
          // Only clear token if it's a genuine auth error
          const errorData = error.response.data;
          if (errorData && (errorData.error === 'Invalid token' || errorData.error === 'Token has expired')) {
            console.log('Auth error, clearing token');
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.reject(new Error('No token found'));
    }
    return api.get('/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData)
};

export const issuesAPI = {
  getAll: (params) => api.get('/issues', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (issueData) => {
    // Handle file upload
    if (issueData instanceof FormData) {
      return api.post('/issues', issueData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    
    // Handle regular JSON data
    const jsonData = {
      title: issueData.title || '',
      description: issueData.description || '',
      issue_type: issueData.issue_type || '',
      priority: issueData.priority || '',
      address: issueData.address || '',
      latitude: issueData.latitude,
      longitude: issueData.longitude
    };

    return api.post('/issues', jsonData);
  },
  update: (id, issueData) => api.put(`/issues/${id}`, issueData),
  delete: (id) => api.delete(`/issues/${id}`),
  getByUser: (userId, params) => api.get(`/issues/user/${userId}`, { params }),
  getTypes: () => api.get('/issues/types'),
  getStatuses: () => api.get('/issues/statuses')
};

// Comments API
export const commentsAPI = {
  getByIssue: (issueId, params = {}) => api.get(`/comments/issues/${issueId}/comments`, { params }),
  create: (issueId, content) => api.post(`/comments/issues/${issueId}/comments`, { content }),
  update: (commentId, content) => api.put(`/comments/comments/${commentId}`, { content }),
  delete: (commentId) => api.delete(`/comments/comments/${commentId}`),
  getById: (commentId) => api.get(`/comments/comments/${commentId}`),
  getByUser: (userId, params = {}) => api.get(`/comments/user/${userId}/comments`, { params }),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getIssuesByType: () => api.get('/analytics/issues-by-type'),
  getIssuesByStatus: () => api.get('/analytics/issues-by-status'),
  getResolutionTime: () => api.get('/analytics/resolution-time'),
  getMonthlyTrends: () => api.get('/analytics/monthly-trends'),
  getUserActivity: () => api.get('/analytics/user-activity'),
  getHeatmapData: () => api.get('/analytics/heatmap-data'),
};

// Admin API
export const adminAPI = {
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getPendingIssues: (params = {}) => api.get('/admin/issues/pending', { params }),
  bulkUpdateIssues: (issueIds, updates) => api.post('/admin/issues/bulk-update', { issue_ids: issueIds, updates }),
  assignIssue: (issueId, assignmentData) => api.post(`/admin/issues/${issueId}/assign`, assignmentData),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  generateReport: (reportData) => api.post('/admin/reports/generate', reportData),
};

// File upload helper
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);

  return api.post('/issues', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

export const getPlaceAutocomplete = async (input) => {
  if (!input || input.length < 3) return { results: [] };
  const response = await api.get('/nominatim-search', {
    params: { q: input }
  });
  return { results: response.data.results };
};

export default api; 