import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16 text-center">
    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
    <p className="text-gray-600 mb-6 max-w-md">Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
    <Link to="/" className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark no-underline">
      Về trang chủ
    </Link>
  </div>
);

export default NotFound;
