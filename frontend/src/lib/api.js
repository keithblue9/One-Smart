import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API, timeout: 90000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("os_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("os_token");
      if (window.location.pathname !== "/") window.location.href = "/";
    }
    return Promise.reject(err);
  }
);
