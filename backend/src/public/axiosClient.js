

const BASE_URL = "http://localhost:3000/api"; // Thay đổi nếu backend chạy ở địa chỉ khác

const axiosClient  = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }
});

// Request interceptor: tự động gắn token
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap dữ liệu và xử lý lỗi chung
axiosClient.interceptors.response.use(
  response => {
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;