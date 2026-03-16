import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  _key: string;
  username: string;
  name: string;
  role_key: string;
  status: string;
  created_at: string;
}

export interface Role {
  _key: string;
  name: string;
  description: string;
  created_at: string;
}

export interface SystemParam {
  _key: string;
  param_key: string;
  param_value: string;
  param_type: string;
  require_restart: boolean;
  category: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    _key: string;
    username: string;
    name: string;
    role_key: string;
    role_name: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) => api.post<{ code: number; message: string; data: LoginResponse }>('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  me: () => api.get<{ code: number; data: LoginResponse['user'] }>('/api/v1/auth/me'),
};

export const userApi = {
  list: () => api.get<{ code: number; data: User[] }>('/api/v1/users'),
  get: (key: string) => api.get<{ code: number; data: User }>(`/api/v1/users/${key}`),
  create: (data: Partial<User> & { password_hash: string }) => api.post('/api/v1/users', data),
  update: (key: string, data: Partial<User>) => api.put(`/api/v1/users/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/users/${key}`),
  resetPassword: (key: string, password: string) => api.post(`/api/v1/users/${key}/reset-password`, { password }),
};

export const roleApi = {
  list: () => api.get<{ code: number; data: Role[] }>('/api/v1/roles'),
  get: (key: string) => api.get<{ code: number; data: Role }>(`/api/v1/roles/${key}`),
  create: (data: Partial<Role>) => api.post('/api/v1/roles', data),
  update: (key: string, data: Partial<Role>) => api.put(`/api/v1/roles/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/roles/${key}`),
};

export const paramsApi = {
  list: () => api.get<{ code: number; data: SystemParam[] }>('/api/v1/system-params'),
  get: (key: string) => api.get<{ code: number; data: SystemParam }>(`/api/v1/system-params/${key}`),
  update: (key: string, param_value: string) => api.put(`/api/v1/system-params/${key}`, { param_value }),
};

export default api;
