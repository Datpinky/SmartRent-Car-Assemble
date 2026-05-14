/**
 * Nội dung tham chiếu theo khung Mau-Hop-Dong-Thue-Xe-Tu-Lai.md (không đọc file .md tại runtime).
 * Dùng cho Bản xem trước hợp đồng (FE-only) tại Checkout.
 */

export const RENTAL_CONTRACT_UI = {
  previewModalTitle: 'Bản xem trước hợp đồng',
  previewBanner:
    'Đây là bản xem trước, chưa phải hợp đồng chính thức từ hệ thống. Sau khi thanh toán thành công, bạn có thể mở Hợp đồng chính thức theo mã đơn trên các màn theo dõi chuyến.',
  officialModalTitle: 'Hợp đồng chính thức',
  previewButton: 'Xem trước hợp đồng thuê xe',
  officialButton: 'Xem hợp đồng thuê xe',
  acceptCheckbox: 'Tôi đã đọc và đồng ý với hợp đồng thuê xe',
  confirmPreviewButton: 'Xác nhận',
  documentTitle: 'HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI',
  stateMotto: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  independence: 'Độc lập – Tự do – Hạnh phúc',
};

export const RENTAL_CONTRACT_LEGAL_BASIS = [
  'Căn cứ Bộ luật Dân sự 2015;',
  'Căn cứ Luật Thương mại 2005;',
  'Căn cứ nhu cầu và khả năng cung ứng của các bên.',
];

/**
 * Điều khoản chính (rút gọn để đọc nhanh trên preview).
 */
export const RENTAL_CONTRACT_MAIN_CLAUSES = [
  {
    title: 'Điều 1 — Đặc điểm và thỏa thuận thuê xe',
    lines: [
      'Bên cho thuê giao xe đúng mô tả; bên thuê nhận xe và sử dụng theo đúng pháp luật.',
      'Xe không tranh chấp quyền sở hữu/sử dụng; không đang bị ràng buộc bởi hợp đồng thuê khác đang hiệu lực (theo cam kết của bên cho thuê).',
    ],
  },
  {
    title: 'Điều 2 — Thời hạn thuê',
    lines: ['Thời hạn thuê theo ngày giờ nhận xe và trả xe đã chọn trên đơn đặt.'],
  },
  {
    title: 'Điều 3 — Mục đích thuê',
    lines: ['Bên thuê sử dụng xe ô tô tự lái đúng mục đích hợp pháp và theo thỏa thuận.'],
  },
  {
    title: 'Điều 4 — Giá thuê và thanh toán',
    lines: ['Giá và phương thức thanh toán theo tổng tiền hiển thị trên đơn và cổng thanh toán điện tử (nếu áp dụng).'],
  },
  {
    title: 'Điều 5–7 — Giao trả xe, nghĩa vụ & quyền các bên',
    lines: [
      'Hết hạn thuê, bên thuê giao trả xe cho bên cho thuê theo thỏa thuận.',
      'Bên cho thuê: giao xe đúng hợp đồng, bảo đảm quyền sử dụng; được nhận tiền thuê và nhận lại tài sản.',
      'Bên thuê: bảo quản xe, trả tiền đúng hạn, không cho thuê lại khi chưa được đồng ý; chịu chi phí phát sinh trong thời gian thuê theo thỏa thuận.',
    ],
  },
  {
    title: 'Điều 8–9 — Cam đoan & điều khoản chung',
    lines: ['Các bên chịu trách nhiệm về tính trung thực của thông tin; ưu tiên thương lượng khi có tranh chấp.'],
  },
];
