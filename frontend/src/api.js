import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
});

// Development-only diagnostics. Never log headers or request bodies:
// they contain the bearer token and user passwords.
if (process.env.NODE_ENV === 'development') {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error(
        'API error:',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        error.response ? error.response.status : error.message
      );
      return Promise.reject(error);
    }
  );
}

export default api;
