import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

// Add a request interceptor
api.interceptors.request.use(config => {
  console.log('API Request:', config.method.toUpperCase(), config.url, 'Headers:', config.headers, 'Data:', config.data);
  return config;
}, error => {
  return Promise.reject(error);
});

// Add a response interceptor
api.interceptors.response.use(response => {
  console.log('API Response:', response.status, response.data);
  return response;
}, error => {
  console.error('API Error Response:', error.response ? error.response.status : 'No response', error.response ? error.response.data : error.message);
  return Promise.reject(error);
});

export default api;
