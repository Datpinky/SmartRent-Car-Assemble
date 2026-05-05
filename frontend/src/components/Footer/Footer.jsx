import React from 'react';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa';

const SOCIAL = [
  { Icon: FaFacebook, label: 'Facebook' },
  { Icon: FaInstagram, label: 'Instagram' },
  { Icon: FaYoutube, label: 'YouTube' },
  { Icon: FaTiktok, label: 'TikTok' },
];

const Footer = () => (
  <footer className="bg-[#1a1a2e] text-gray-400 pt-[60px] pb-6 px-5">
    <div className="max-w-[1280px] mx-auto grid grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-10 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
      {/* Brand */}
      <div className="flex flex-col gap-3.5">
        <div>
          <img
            src="/logo_transparent.png"
            alt="SmartRent Car Rental"
            width={150}
            height={40}
            className="h-10 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <p className="text-[0.85rem] leading-[1.7] text-gray-500 max-w-[280px]">
          Nền tảng thuê xe tự lái hàng đầu Việt Nam. Kết nối chủ xe và khách thuê một cách nhanh chóng, an toàn và tiện lợi.
        </p>
        <div className="flex gap-2.5 mt-1">
          {SOCIAL.map(({ Icon, label }) => (
            <button
              type="button"
              key={label}
              aria-label={label}
              className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-gray-400 text-[0.9rem] border border-white/[0.08] transition-[background-color,color,border-color,transform] hover:bg-primary hover:text-white hover:border-primary hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>

      </div>

      {/* About */}
      <div>
        <h3 className="text-[0.85rem] font-bold text-white uppercase tracking-[0.8px] mb-4">Về SmartRent</h3>
        <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
          {['Giới thiệu', 'Tuyển dụng', 'Tin tức', 'Blog', 'Đối tác', 'Liên hệ'].map(t => (
            <li key={t}>
              <button
                type="button"
                className="text-left text-[0.82rem] text-gray-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary no-underline"
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Support */}
      <div>
        <h3 className="text-[0.85rem] font-bold text-white uppercase tracking-[0.8px] mb-4">Hỗ trợ</h3>
        <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
          {['Hướng dẫn đặt xe', 'Chính sách thuê xe', 'Quy định bảo hiểm', 'Câu hỏi thường gặp', 'Trung tâm hỗ trợ'].map(t => (
            <li key={t}>
              <button
                type="button"
                className="text-left text-[0.82rem] text-gray-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary no-underline"
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Partner */}
      <div>
        <h3 className="text-[0.85rem] font-bold text-white uppercase tracking-[0.8px] mb-4">Chủ xe</h3>
        <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
          {['Ký gửi xe', 'Hướng dẫn ký gửi', 'Chính sách chủ xe', 'Doanh thu & thống kê', 'Cộng đồng chủ xe'].map(t => (
            <li key={t}>
              <button
                type="button"
                className="text-left text-[0.82rem] text-gray-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary no-underline"
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="max-w-[1280px] mx-auto border-t border-white/[0.06] pt-6 flex items-center justify-between text-[0.78rem] text-gray-600 max-[560px]:flex-col max-[560px]:gap-2.5 max-[560px]:text-center">
      <span>© 2026 SmartRent Car. Tất cả quyền được bảo lưu.</span>
      <nav aria-label="Liên kết pháp lý" className="flex gap-5">
        <button
          type="button"
          className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary no-underline"
        >
          Điều khoản sử dụng
        </button>
        <button
          type="button"
          className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary no-underline"
        >
          Chính sách bảo mật
        </button>
        <button
          type="button"
          className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:text-primary no-underline"
        >
          Cookie
        </button>
      </nav>
    </div>
  </footer>
);

export default Footer;
