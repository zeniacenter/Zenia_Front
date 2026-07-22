import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let currentBranchId = null;

export const setBranchId = (id) => { currentBranchId = id; };
export const getBranchId = () => currentBranchId;

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('zenia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (currentBranchId) {
    config.headers['X-Branch-Id'] = currentBranchId;
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
  myPermissions: () => api.get('/admin/my-permissions'),
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
  busySlots: (id, date, excludeAppointmentId) => {
    const params = { date };
    if (excludeAppointmentId) params.exclude_appointment_id = excludeAppointmentId;
    return api.get(`/therapists/${id}/busy-slots`, { params });
  },
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
  propagatePayment: (packageId, personId) => api.post('/admin/appointments/propagate-payment', { package_id: packageId, person_id: personId }),
  propagatePaymentGroup: (groupId, personId) => api.post('/admin/appointments/propagate-payment-group', { group_id: groupId, person_id: personId }),
};

export const personAPI = {
  searchByDni: (dni) => api.get('/persons/search-by-dni', { params: { dni } }),
};

const buildReportsUrl = (params, path) => {
  const query = new URLSearchParams();
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  if (params.branch_id) query.set('branch_id', params.branch_id);
  if (params.therapist_id) query.set('therapist_id', params.therapist_id);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
};

export const reportsAPI = {
  dashboard: () => api.get('/admin/reports/dashboard'),
  dashboardData: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/dashboard-data')),
  weeklyRevenue: () => api.get('/admin/reports/weekly-revenue'),
  occupancy: () => api.get('/admin/reports/occupancy'),
  peakHours: () => api.get('/admin/reports/peak-hours'),
  revenueByHour: () => api.get('/admin/reports/revenue-by-hour'),
  revenueByCategory: () => api.get('/admin/reports/revenue-by-category'),
  filtered: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/filtered')),
  exportPdf: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/export/pdf'), { responseType: 'blob' }),
  exportExcel: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/export/excel'), { responseType: 'blob' }),
  exportSummaryPdf: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/export/summary-pdf'), { responseType: 'blob' }),
  exportSummaryExcel: (params = {}) => api.get(buildReportsUrl(params, '/admin/reports/export/summary-excel'), { responseType: 'blob' }),
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
