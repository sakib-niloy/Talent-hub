import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  // Do not set Content-Type globally; let browser set it for FormData
});

export default api;
