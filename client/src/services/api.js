import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let memoryToken = null;

export function setAuthToken(token) {
  memoryToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.request.use((config) => {
  if (memoryToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

export function getErrorMessage(err) {
  return err?.response?.data?.error?.message || err.message || 'Something went wrong';
}
