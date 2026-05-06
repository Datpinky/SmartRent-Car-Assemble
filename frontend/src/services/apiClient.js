import axios from 'axios';

const AUTH_CLEARED_EVENT = 'smartrent:auth-cleared';

const BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3000';

const clearStoredAuth = () => {
  localStorage.removeItem('smartrent_token');
  localStorage.removeItem('smartrent_user');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartrent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const validationErrors = error.response?.data?.errors;

    let normalizedMessage = 'Da xay ra loi. Vui long thu lai.';

    const reqUrl = error.config?.url || '';
    const isLoginRequest = reqUrl.includes('/api/auth/login');

    if (!error.response) {
      normalizedMessage = 'Khong the ket noi den may chu. Kiem tra backend dang chay tai cong 3000 (hoac REACT_APP_API_URL).';
    } else if (status === 401) {
      const enToVi = {
        'Invalid email or password': 'Email hoac mat khau khong dung.',
        'Password not compare': 'Email hoac mat khau khong dung.',
      };

      normalizedMessage =
        enToVi[serverMessage] ||
        serverMessage ||
        (isLoginRequest
          ? 'Email hoặc mật khẩu không đúng.'
          : 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');

      if (!isLoginRequest) {
        clearStoredAuth();
      }
    } else if (status === 403) {
      const isReview =
        reqUrl.includes('/api/reviews/create') ||
        reqUrl.includes('/api/reviews/update');

      if (
        isReview &&
        serverMessage &&
        String(serverMessage).toLowerCase().includes('insufficient permissions')
      ) {
        normalizedMessage =
          'Chi tai khoan khach thue moi co the gui hoac sua danh gia. Vui long dang nhap bang tai khoan khach thue.';
      } else {
        normalizedMessage = serverMessage || 'Ban khong co quyen thuc hien thao tac nay.';
      }
    } else if (status === 404) {
      normalizedMessage = serverMessage || 'Khong tim thay du lieu yeu cau.';
    } else if (status === 422 && validationErrors) {
      normalizedMessage = validationErrors.map((item) => item.msg || item.message).join(', ');
    } else if (serverMessage) {
      normalizedMessage = serverMessage;
    }

    const normalizedError = new Error(normalizedMessage);
    normalizedError.status = status;
    normalizedError.raw = error.response?.data;
    return Promise.reject(normalizedError);
  }
);

export default apiClient;
