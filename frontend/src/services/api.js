import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function for exponential backoff delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check if error is a network error
const isNetworkError = (error) => {
  return !error.response && error.code !== 'ECONNABORTED';
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no original request config, can't handle retries or other logic
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('token', accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const errorMessage = 'Access denied. You do not have permission to perform this action.';
      error.userMessage = errorMessage;
      return Promise.reject(error);
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      const errorMessage = 'Resource not found. The requested item does not exist.';
      error.userMessage = errorMessage;
      return Promise.reject(error);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      const errorMessage = 'Server error. Please try again later.';
      error.userMessage = errorMessage;
      return Promise.reject(error);
    }

    // Handle network errors with retry
    if (isNetworkError(error)) {
      // Initialize retry count if not set
      if (originalRequest._retryCount === undefined) {
        originalRequest._retryCount = 0;
      }
      
      // Check if we should retry (max 3 retries)
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, originalRequest._retryCount - 1) * 1000;
        await delay(delayMs);
        
        // Retry the request
        return api(originalRequest);
      } else {
        // Max retries reached
        const errorMessage = 'Network error. Please check your connection and try again.';
        error.userMessage = errorMessage;
        return Promise.reject(error);
      }
    }

    // Handle 400 Bad Request with validation errors
    if (error.response?.status === 400 && error.response?.data?.errors) {
      // Pass through validation errors from API
      error.userMessage = 'Validation failed';
      error.validationErrors = error.response.data.errors;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: (data) => api.post('/auth/refresh', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

export const clubAPI = {
  getAll: (params) => api.get('/clubs', { params }),
  getById: (id) => api.get(`/clubs/${id}`),
  create: (data) => api.post('/clubs', data),
  update: (data) => api.put('/clubs', data),
  delete: () => api.delete('/clubs'),
  join: (id) => api.post(`/clubs/${id}/join`),
  leave: (id) => api.delete(`/clubs/${id}/leave`),
  getMembers: (id) => api.get(`/clubs/${id}/members`),
  getEvents: (id) => api.get(`/clubs/${id}/events`),
};

export const eventAPI = {
  getAll: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

export const rsvpAPI = {
  create: (eventId, status) => api.post(`/rsvp/events/${eventId}`, { status }),
  getUserRSVPs: (params) => api.get('/rsvp/my-rsvps', { params }),
  getEventRSVPs: (eventId, params) => api.get(`/rsvp/events/${eventId}`, { params }),
  delete: (eventId) => api.delete(`/rsvp/events/${eventId}`),
};

export const discoverAPI = {
  getResults: (params) => api.get('/discover', { params }),
};

export const trendingAPI = {
  getTrending: () => api.get('/trending'),
};

export const notificationAPI = {
  getNotifications: (page, limit) => api.get('/notifications', { params: { page, limit } }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getConversationMessages: (id) => api.get(`/messages/conversations/${id}`),
  sendMessage: (conversationId, content) => api.post('/messages', { conversationId, content }),
  createConversation: (participantIds, initialMessage) => api.post('/messages/conversations', { participantIds, initialMessage }),
};

export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  changePassword: (currentPassword, newPassword) => api.put('/settings/password', { currentPassword, newPassword }),
};

export default api;