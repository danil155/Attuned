import axios from "axios";

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        error.userMessage = error.response?.data?.detail || error.message || 'Unknown error';
        return Promise.reject(error);
    }
);

export default api;
