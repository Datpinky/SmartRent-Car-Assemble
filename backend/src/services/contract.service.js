const path = require('path');
const PDFDocument = require('pdfkit');
const { v2: cloudinary } = require('cloudinary');
const RentalContractRecord = require('../models/rentalContractRecord.model');
const Booking = require('../models/booking.model');
const UserModel = require('../models/user.model');
const VehicleModel = require('../models/vehicle.model');
const throwError = require('../utils/throwError');

const FONT_NORMAL = path.join(__dirname, '../fonts/DejaVuSans.ttf');
const FONT_BOLD = path.join(__dirname, '../fonts/DejaVuSans-Bold.ttf');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateContractNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `HDTX-${yy}${mm}${dd}-${rand}`;
}

function formatDate(d) {
  if (!d) return '___/___/______';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function formatCurrency(n) {
  if (!n && n !== 0) return '0 VNĐ';
  return n.toLocaleString('vi-VN') + ' VNĐ';
}

/** Upload a Buffer to Cloudinary and return the secure URL */
async function uploadBufferToCloudinary(buffer, folder = 'contracts') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', format: 'pdf', type: 'upload', access_mode: 'public' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/** Convert base64 data URI to a Buffer */
function base64ToBuffer(dataUri) {
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

// ─── PDF generation ───────────────────────────────────────────────────────────

async function generateContractPDF(contract) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
      doc.registerFont('Regular', FONT_NORMAL);
      doc.registerFont('Bold', FONT_BOLD);
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 120; // usable width

      // ── Helpers ──
      const center = (text, opts = {}) => doc.text(text, { align: 'center', ...opts });
      const normal = (text, opts = {}) => doc.text(text, { align: 'left', lineGap: 2, ...opts });
      const bold = (text, opts = {}) => doc.font('Bold').text(text, { align: 'left', lineGap: 2, ...opts });
      const resetFont = () => doc.font('Regular').fontSize(10);

      resetFont();

      // ── Header ──
      doc.fontSize(10).font('Bold');
      center('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      center('Độc lập - Tự do - Hạnh phúc');
      doc.moveDown(0.3);
      doc.fontSize(14).font('Bold');
      center('HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI');
      resetFont();
      center(`Số: ${contract.contract_number}`);
      doc.moveDown(0.5);

      // ── Legal basis ──
      normal('Căn cứ Bộ Luật Dân sự 2015;');
      normal('Căn cứ Luật Thương mại 2005;');
      normal('Căn cứ vào nhu cầu và khả năng cung ứng của các bên dưới đây.');
      doc.moveDown(0.5);
      normal(`Hôm nay, ngày ${formatDate(contract.signed_at || new Date())}, hai bên gồm:`);
      doc.moveDown(0.5);

      // ── Bên A ──
      doc.fontSize(11).font('Bold');
      normal('BÊN CHO THUÊ (Bên A):');
      resetFont();
      normal(`Tên showroom / đại diện: ${contract.party_a_name}`);
      if (contract.party_a_representative) normal(`Người đại diện: ${contract.party_a_representative}`);
      if (contract.party_a_tax_code) normal(`Mã số thuế: ${contract.party_a_tax_code}`);
      if (contract.party_a_phone) normal(`Điện thoại: ${contract.party_a_phone}`);
      if (contract.party_a_email) normal(`Email: ${contract.party_a_email}`);
      if (contract.party_a_address) normal(`Địa chỉ: ${contract.party_a_address}`);
      doc.moveDown(0.5);

      // ── Bên B ──
      doc.fontSize(11).font('Bold');
      normal('BÊN THUÊ (Bên B):');
      resetFont();
      normal(`Họ và tên: ${contract.party_b_name}`);
      if (contract.party_b_phone) normal(`Điện thoại: ${contract.party_b_phone}`);
      if (contract.party_b_email) normal(`Email: ${contract.party_b_email}`);
      if (contract.party_b_address) normal(`Địa chỉ: ${contract.party_b_address}`);
      if (contract.party_b_license_number)
        normal(
          `Giấy phép lái xe số: ${contract.party_b_license_number} - Hạng: ${contract.party_b_license_class || '---'}`,
        );
      doc.moveDown(0.5);
      normal('Hai bên đã thỏa thuận và thống nhất ký kết hợp đồng với các điều khoản sau:');
      doc.moveDown(0.5);

      // ── Điều 1 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 1. Đặc điểm và thỏa thuận thuê xe');
      resetFont();
      normal(`Nhãn hiệu: ${contract.vehicle_brand || '---'}   Số loại: ${contract.vehicle_model || '---'}`);
      normal(`Loại xe: ${contract.vehicle_type || '---'}   Số chỗ: ${contract.vehicle_seats || '---'}`);
      if (contract.vehicle_engine_number) normal(`Số máy: ${contract.vehicle_engine_number}`);
      if (contract.vehicle_frame_number) normal(`Số khung: ${contract.vehicle_frame_number}`);
      normal(`Biển số: ${contract.vehicle_plate || '---'}`);
      normal(`Tên xe: ${contract.vehicle_name}`);
      doc.moveDown(0.5);

      // ── Điều 2 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 2. Thời hạn thuê xe');
      resetFont();
      normal(`Từ ngày: ${formatDate(contract.start_date)}  đến ngày: ${formatDate(contract.end_date)}`);
      normal(`Số ngày thuê: ${contract.duration_days} ngày`);
      doc.moveDown(0.5);

      // ── Điều 3 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 3. Mục đích thuê');
      resetFont();
      normal('Bên B sử dụng xe vào mục đích di chuyển cá nhân / du lịch hợp pháp.');
      doc.moveDown(0.5);

      // ── Điều 4 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 4. Giá thuê và phương thức thanh toán');
      resetFont();
      normal(`Giá thuê: ${formatCurrency(contract.daily_rate)} / ngày`);
      if (contract.service_fee) normal(`Phí dịch vụ: ${formatCurrency(contract.service_fee)}`);
      normal(`Tổng thanh toán: ${formatCurrency(contract.total_price)}`);
      normal(`Phương thức thanh toán: ${contract.payment_method}`);
      doc.moveDown(0.5);

      // ── Điều 5 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 5. Phương thức giao, trả lại tài sản thuê');
      resetFont();
      normal('Hết thời hạn thuê, Bên B phải giao trả xe cho Bên A đúng tình trạng ban đầu.');
      doc.moveDown(0.5);

      // ── Điều 6 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 6. Nghĩa vụ và quyền của Bên A');
      resetFont();
      normal(
        '1. Nghĩa vụ: Chuyển giao tài sản đúng thỏa thuận; bảo đảm giá trị sử dụng; bảo đảm quyền sử dụng cho Bên B.',
      );
      normal('2. Quyền: Nhận đủ tiền thuê; nhận lại tài sản khi hết hạn; đình chỉ hợp đồng nếu Bên B vi phạm.');
      doc.moveDown(0.5);

      // ── Điều 7 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 7. Nghĩa vụ và quyền của Bên B');
      resetFont();
      normal(
        '1. Nghĩa vụ: Bảo quản xe như tài sản của mình; sử dụng đúng mục đích; trả đủ tiền thuê; trả lại xe đúng hạn; chịu toàn bộ chi phí phát sinh do lỗi trong quá trình thuê.',
      );
      normal(
        '2. Quyền: Nhận tài sản đúng thỏa thuận; sử dụng theo công dụng; đình chỉ hợp đồng nếu Bên A vi phạm nghiêm trọng.',
      );
      doc.moveDown(0.5);

      // ── Điều 8 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 8. Cam kết và bảo đảm');
      resetFont();
      normal(
        'Các bên cam kết thông tin cung cấp là trung thực, hợp pháp, còn hiệu lực; giao kết tự nguyện, không lừa dối hoặc ép buộc.',
      );
      doc.moveDown(0.5);

      // ── Điều 9 ──
      doc.fontSize(11).font('Bold');
      normal('Điều 9. Điều khoản chung');
      resetFont();
      normal(
        'Hợp đồng có hiệu lực kể từ khi các bên ký kết. Tranh chấp ưu tiên thương lượng; nếu không thành sẽ đưa ra Tòa án nhân dân có thẩm quyền. Mọi sửa đổi, bổ sung phải bằng văn bản và có chữ ký của cả hai bên.',
      );
      doc.moveDown(1.5);

      // ── Ký tên ──
      const signY = doc.y;
      const colW = W / 2;

      doc.fontSize(11).font('Bold');
      doc.text('BÊN A (Cho thuê)', 60, signY, { width: colW, align: 'center' });
      doc.text('BÊN B (Thuê)', 60 + colW, signY, { width: colW, align: 'center' });

      resetFont();
      const nameY = signY + 15;
      doc.text(contract.party_a_name, 60, nameY, { width: colW, align: 'center' });
      doc.text(contract.party_b_name, 60 + colW, nameY, { width: colW, align: 'center' });

      const sigImgY = nameY + 20;
      const sigImgH = 70;
      const sigImgW = 160;

      // Draw Showroom signature
      if (contract.showroom_signature) {
        try {
          const buf = base64ToBuffer(contract.showroom_signature);
          doc.image(buf, 60 + (colW - sigImgW) / 2, sigImgY, { width: sigImgW, height: sigImgH });
        } catch (_) {
          doc.rect(60 + (colW - sigImgW) / 2, sigImgY, sigImgW, sigImgH).stroke();
        }
      } else {
        doc.rect(60 + (colW - sigImgW) / 2, sigImgY, sigImgW, sigImgH).stroke();
      }

      // Draw Renter signature
      if (contract.renter_signature) {
        try {
          const buf = base64ToBuffer(contract.renter_signature);
          doc.image(buf, 60 + colW + (colW - sigImgW) / 2, sigImgY, { width: sigImgW, height: sigImgH });
        } catch (_) {
          doc.rect(60 + colW + (colW - sigImgW) / 2, sigImgY, sigImgW, sigImgH).stroke();
        }
      } else {
        doc.rect(60 + colW + (colW - sigImgW) / 2, sigImgY, sigImgW, sigImgH).stroke();
      }

      const dateSignY = sigImgY + sigImgH + 10;
      if (contract.renter_signed_at) {
        doc.text(`Ngày ký: ${formatDate(contract.renter_signed_at)}`, 60 + colW, dateSignY, {
          width: colW,
          align: 'center',
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Service class ────────────────────────────────────────────────────────────

class ContractService {
  /**
   * Tạo bản ghi hợp đồng sau khi booking được thanh toán thành công.
   * Gọi từ payment.service.js sau khi xác nhận Stripe webhook / confirm.
   */
  async createAfterPayment(bookingId) {
    const booking = await Booking.findById(bookingId)
      .populate('user_id', '-password')
      .populate('showroom_id', '-password')
      .populate('vehicle_id');

    if (!booking) throwError('Không tìm thấy booking', 404);

    // Nếu đã có contract cho booking này thì trả về luôn
    const existing = await RentalContractRecord.findOne({ booking_id: bookingId });
    if (existing) return existing;

    const renter = booking.user_id;
    const showroom = booking.showroom_id;
    const vehicle = booking.vehicle_id;

    const durationDays = Math.max(
      1,
      Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24)),
    );
    const dailyRate = durationDays > 0 ? Math.round(booking.total_price / durationDays) : booking.total_price;

    const record = new RentalContractRecord({
      booking_id: booking._id,
      renter_user_id: renter._id,
      showroom_user_id: showroom._id,
      vehicle_id: vehicle._id,

      contract_number: generateContractNumber(),

      party_a_name: showroom.business_name || showroom.name,
      party_a_email: showroom.email,
      party_a_phone: showroom.phone || '',
      party_a_address: showroom.address || '',
      party_a_tax_code: showroom.tax_code || '',
      party_a_representative: showroom.name,
      showroom_signature: showroom.signature || null,

      party_b_name: renter.name,
      party_b_email: renter.email,
      party_b_phone: renter.phone || '',
      party_b_address: renter.address || '',
      party_b_license_number: renter.driver_license_number || '',
      party_b_license_class: renter.driver_license_class || '',

      vehicle_name: vehicle.vehicle_name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim(),
      vehicle_plate: vehicle.vehicle_plate_number || '',
      vehicle_type: vehicle.vehicle_type || '',
      vehicle_brand: vehicle.brand || vehicle.vehicle_brand || '',
      vehicle_model: vehicle.model || vehicle.vehicle_model || '',
      vehicle_seats: vehicle.number_of_seats || 0,
      vehicle_engine_number: vehicle.vehicle_engine_number || '',
      vehicle_frame_number: vehicle.vehicle_identification_number || '',
      vehicle_fuel_type: vehicle.fuel_type || '',
      vehicle_year: vehicle.year || 0,

      start_date: booking.start_date,
      end_date: booking.end_date,
      duration_days: durationDays,
      daily_rate: dailyRate,
      service_fee: 0,
      total_price: booking.total_price,
      payment_method: 'Stripe',

      status: 'pending_signature',
    });

    await record.save();
    return record;
  }

  async getByBookingId(bookingId, requestingUserId) {
    let contract = await RentalContractRecord.findOne({ booking_id: bookingId });
    if (!contract) {
      contract = await this.createAfterPayment(bookingId);
    }

    // Backfill showroom_signature nếu lúc tạo hợp đồng showroom chưa có chữ ký
    if (!contract.showroom_signature) {
      const showroomUser = await UserModel.findById(contract.showroom_user_id).select('signature');
      if (showroomUser?.signature) {
        contract.showroom_signature = showroomUser.signature;
        await contract.save();
      }
    }

    return contract;
  }

  /**
   * Renter ký hợp đồng (vẽ tay) → lưu chữ ký → tạo PDF → upload Cloudinary.
   */
  async signByRenter(contractId, renterId, signatureBase64) {
    const contract = await RentalContractRecord.findById(contractId);
    if (!contract) throwError('Không tìm thấy hợp đồng', 404);

    if (String(contract.renter_user_id) !== String(renterId)) {
      throwError('Bạn không có quyền ký hợp đồng này', 403);
    }
    // Kiểm tra kép: cả status lẫn trường chữ ký để đảm bảo không thể ghi đè
    if (contract.status === 'signed') throwError('Hợp đồng đã được ký rồi', 400);
    if (contract.renter_signature) throwError('Chữ ký hợp đồng đã tồn tại và không thể thay đổi', 400);
    if (!signatureBase64 || signatureBase64.length < 100) throwError('Chữ ký không hợp lệ', 400);

    contract.renter_signature = signatureBase64;
    contract.renter_signed_at = new Date();
    contract.signed_at = new Date();
    contract.status = 'signed';

    // ── Generate & upload PDF ──
    const pdfBuffer = await generateContractPDF(contract);
    const pdfUrl = await uploadBufferToCloudinary(pdfBuffer, 'contracts');
    contract.pdf_url = pdfUrl;

    await contract.save();
    return contract;
  }

  /**
   * Danh sách hợp đồng của renter (người thuê).
   */
  async listByRenter(renterId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      RentalContractRecord.find({ renter_user_id: renterId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RentalContractRecord.countDocuments({ renter_user_id: renterId }),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Danh sách hợp đồng của showroom.
   */
  async listByShowroom(showroomId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      RentalContractRecord.find({ showroom_user_id: showroomId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RentalContractRecord.countDocuments({ showroom_user_id: showroomId }),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Regenerate PDF cho hợp đồng đã ký (dùng khi PDF cũ bị lỗi font).
   * Chỉ cho phép renter hoặc showroom của hợp đồng đó.
   */
  async regeneratePdf(contractId, userId) {
    const contract = await RentalContractRecord.findById(contractId);
    if (!contract) throwError('Không tìm thấy hợp đồng', 404);
    if (contract.status !== 'signed') throwError('Chỉ có thể tạo lại PDF cho hợp đồng đã ký', 400);
    const isOwner =
      String(contract.renter_user_id) === String(userId) || String(contract.showroom_user_id) === String(userId);
    if (!isOwner) throwError('Bạn không có quyền truy cập hợp đồng này', 403);

    // Luôn lấy chữ ký showroom mới nhất từ profile trước khi generate PDF
    const showroomUser = await UserModel.findById(contract.showroom_user_id).select('signature');
    if (showroomUser?.signature) {
      contract.showroom_signature = showroomUser.signature;
    }

    const pdfBuffer = await generateContractPDF(contract);
    const pdfUrl = await uploadBufferToCloudinary(pdfBuffer, 'contracts');
    contract.pdf_url = pdfUrl;
    await contract.save();
    return contract;
  }

  /**
   * Admin: lấy tất cả hợp đồng.
   */
  async listAll({ page = 1, limit = 10, status } = {}) {
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      RentalContractRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RentalContractRecord.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }
}

module.exports = new ContractService();
