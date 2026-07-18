import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('zenia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('zenia_token');
      sessionStorage.removeItem('zenia_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  register: (data) => api.post('/register', data),
  me: () => api.get('/me'),
  logout: () => api.post('/logout'),
};

export const usersAPI = {
  list: () => api.get('/admin/users'),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
};

export const servicesAPI = {
  list: () => api.get('/services'),
  listAll: () => api.get('/admin/services'),
  create: (data) => api.post('/admin/services', data),
  update: (id, data) => api.put(`/admin/services/${id}`, data),
  delete: (id) => api.delete(`/admin/services/${id}`),
};

export const packagesAPI = {
  list: () => api.get('/packages'),
  listAll: () => api.get('/admin/packages'),
  create: (data) => api.post('/admin/packages', data),
  update: (id, data) => api.put(`/admin/packages/${id}`, data),
  delete: (id) => api.delete(`/admin/packages/${id}`),
};

export const therapistsAPI = {
  list: () => api.get('/therapists'),
  listAll: () => api.get('/admin/therapists'),
  create: (data) => api.post('/admin/therapists', data),
  update: (id, data) => api.put(`/admin/therapists/${id}`, data),
  delete: (id) => api.delete(`/admin/therapists/${id}`),
  availability: (id, date) => api.get(`/therapists/${id}/availability`, { params: { date } }),
};

export const cabinsAPI = {
  list: () => api.get('/cabins'),
  listAll: () => api.get('/admin/cabins'),
  create: (data) => api.post('/admin/cabins', data),
  update: (id, data) => api.put(`/admin/cabins/${id}`, data),
  delete: (id) => api.delete(`/admin/cabins/${id}`),
};

export const appointmentsAPI = {
  list: (params) => api.get('/admin/appointments', { params }),
  get: (id) => api.get(`/admin/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/admin/appointments/${id}`, data),
  delete: (id) => api.delete(`/admin/appointments/${id}`),
  calendar: (params) => api.get('/admin/appointments/calendar', { params }),
};

export const reportsAPI = {
  dashboard: () => api.get('/admin/reports/dashboard'),
  weeklyRevenue: () => api.get('/admin/reports/weekly-revenue'),
  occupancy: () => api.get('/admin/reports/occupancy'),
  peakHours: () => api.get('/admin/reports/peak-hours'),
  revenueByHour: () => api.get('/admin/reports/revenue-by-hour'),
  revenueByCategory: () => api.get('/admin/reports/revenue-by-category'),
};

export const uploadAPI = {
  image: (file, imageableType, imageableId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageable_type', imageableType);
    formData.append('imageable_id', String(imageableId));
    return api.post('/admin/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
  },
};

export const whatsappAPI = {
  sendMessage: (phone, message) => {
    const baseUrl = import.meta.env.VITE_WHATSAPP_URL || 'http://localhost:3100';
    const token = import.meta.env.VITE_WHATSAPP_API_TOKEN;
    return fetch(`${baseUrl}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone, message })
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          const error = new Error(data.message || 'Error al enviar');
          error.response = { data, status: response.status };
          throw error;
        });
      }
      return response.json();
    });
  }
};

export const branchesAPI = {
  list: () => api.get('/branches'),
  listAll: () => api.get('/admin/branches'),
  create: (data) => api.post('/admin/branches', data),
  update: (id, data) => api.put(`/admin/branches/${id}`, data),
  delete: (id) => api.delete(`/admin/branches/${id}`),
};

export default api;
