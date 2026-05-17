const axios = require('axios');
const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Vehicle = require('../models/vehicle.model');
const VehicleInspection = require('../models/vehicleInspection.model');
const AiService = require('./ai.service');
const throwError = require('../utils/throwError');

function normalizeRole(role) {
  return role === 'user' ? 'renter' : role;
}

async function fetchUrlToImageInput(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 45000,
      maxContentLength: 15 * 1024 * 1024,
      validateStatus: (s) => s === 200,
    });
    let mime = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim();
    if (!mime.startsWith('image/')) mime = 'image/jpeg';
    return { type: 'file', buffer: Buffer.from(res.data), mimetype: mime };
  } catch (e) {
    console.warn('[inspectionReturnReview] fetchUrlToImageInput failed', url?.slice?.(0, 80), e.message);
    return null;
  }
}

function assertCanManageReturnReview(booking, role, userId) {
  const r = normalizeRole(role);
  if (r === 'admin') return;
  if (r !== 'showroom') throwError('Chỉ showroom hoặc admin được thực hiện thao tác này', 403);
  const sid = booking.showroom_id ? booking.showroom_id.toString() : '';
  if (sid !== userId.toString()) throwError('Bạn không có quyền với booking này', 403);
}

async function loadBookingLean(bookingId) {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throwError('bookingId không hợp lệ', 400);
  const booking = await Booking.findById(bookingId)
    .populate('vehicle_id', 'vehicle_name vehicle_brand vehicle_model vehicle_plate_number images image added_by')
    .populate('user_id', 'name email full_name')
    .lean();
  if (!booking) throwError('Không tìm thấy booking', 404);
  return booking;
}

async function findLatestRenterReturnInspection(bookingId) {
  return VehicleInspection.findOne({
    booking_id: bookingId,
    inspection_type: 'return',
    inspected_by_role: 'renter',
  }).sort({ createdAt: -1 });
}

class InspectionReturnReviewService {
  static async getReturnReview(bookingId, role, userId) {
    const booking = await loadBookingLean(bookingId);
    assertCanManageReturnReview(booking, role, userId);

    const inspection = await findLatestRenterReturnInspection(bookingId);

    const pickupImages = Array.isArray(booking.pickup_images) ? booking.pickup_images.filter(Boolean).slice(0, 6) : [];
    const returnImages = inspection ? (Array.isArray(inspection.return_images) ? inspection.return_images : []) : [];

    const latestDraftRun =
      inspection?.analysis_runs?.length > 0 ? inspection.analysis_runs[inspection.analysis_runs.length - 1] : null;

    const latestOfficial = inspection?.published_to_renter
      ? {
          damage_detected: inspection.damage_detected,
          severity: inspection.severity,
          observations: inspection.observations,
          summary: inspection.summary,
          conclusion: inspection.conclusion,
          disclaimer: inspection.disclaimer,
          ai_payload: inspection.ai_payload,
          confirmed_at: inspection.confirmed_at,
          confirmed_by: inspection.confirmed_by,
        }
      : null;

    return {
      booking,
      vehicle: booking.vehicle_id,
      renter: booking.user_id,
      pickup_images: pickupImages,
      return_images: returnImages,
      inspection_id: inspection?._id || null,
      ai_status: inspection?.ai_status || 'not_run',
      published_to_renter: !!inspection?.published_to_renter,
      analysis_runs: inspection?.analysis_runs || [],
      latest_official: latestOfficial,
      latest_draft_run: latestDraftRun,
    };
  }

  static async analyze(bookingId, role, userId) {
    const booking = await loadBookingLean(bookingId);
    assertCanManageReturnReview(booking, role, userId);

    if (booking.status !== 'waiting_return_confirmation') {
      throwError('Chỉ phân tích khi đơn đang ở trạng thái chờ xác nhận trả xe', 400);
    }

    const inspection = await findLatestRenterReturnInspection(bookingId);
    if (!inspection) throwError('Chưa có biên bản trả xe từ khách thuê', 400);
    const afterUrls = Array.isArray(inspection.return_images) ? inspection.return_images.filter(Boolean).slice(0, 6) : [];
    if (!afterUrls.length) throwError('Chưa có ảnh trả xe để phân tích', 400);

    const beforeUrls = Array.isArray(booking.pickup_images) ? booking.pickup_images.filter(Boolean).slice(0, 6) : [];

    const beforeImages = [];
    for (const url of beforeUrls) {
      const img = await fetchUrlToImageInput(url);
      if (img) beforeImages.push(img);
    }
    const afterImages = [];
    for (const url of afterUrls) {
      const img = await fetchUrlToImageInput(url);
      if (img) afterImages.push(img);
    }
    if (!afterImages.length) throwError('Không tải được ảnh trả xe từ storage để gửi AI', 502);

    inspection.ai_status = 'processing';
    await inspection.save();

    let analysis;
    try {
      analysis =
        beforeImages.length > 0
          ? await AiService.compareBeforeAfterGallery(beforeImages, afterImages)
          : await AiService.compareGalleryImages(afterImages);
    } catch (e) {
      const failRun = {
        run_by: userId,
        run_at: new Date(),
        status: 'failed',
        error_message: e.message || String(e),
        ai_payload: {},
        damage_detected: false,
        severity: 'none',
        observations: [],
        summary: '',
        conclusion: '',
      };
      inspection.analysis_runs.push(failRun);
      inspection.ai_status = 'failed';
      await inspection.save();
      throw e;
    }

    const run = {
      run_by: userId,
      run_at: new Date(),
      status: 'completed',
      error_message: '',
      ai_payload: analysis,
      damage_detected: !!analysis.damage_detected,
      severity: analysis.severity || 'none',
      observations: Array.isArray(analysis.observations) ? analysis.observations : [],
      summary: analysis.summary || '',
      conclusion: analysis.conclusion || '',
    };
    inspection.analysis_runs.push(run);
    inspection.ai_status = 'completed';
    inspection.comparison_mode = analysis.comparison_mode || (beforeImages.length > 0 ? 'gallery' : 'current_only');
    await inspection.save();

    return { analysis, inspection, run };
  }

  static async confirm(bookingId, role, userId, { manual = false, note = '' } = {}) {
    const booking = await loadBookingLean(bookingId);
    assertCanManageReturnReview(booking, role, userId);

    if (booking.status !== 'waiting_return_confirmation') {
      throwError('Booking không ở trạng thái chờ xác nhận trả xe', 400);
    }

    const inspection = await findLatestRenterReturnInspection(bookingId);
    if (!inspection) throwError('Không tìm thấy biên bản trả xe', 404);

    if (manual) {
      const text = (note && String(note).trim()) || 'Showroom xác nhận trả xe thủ công.';
      inspection.ai_payload = {
        ...((inspection.ai_payload && typeof inspection.ai_payload === 'object' && !Array.isArray(inspection.ai_payload))
          ? inspection.ai_payload
          : {}),
        manual: true,
        summary: text,
        conclusion: text,
      };
      inspection.damage_detected = false;
      inspection.severity = 'none';
      inspection.observations = [];
      inspection.summary = text;
      inspection.conclusion = text;
    } else {
      const runs = inspection.analysis_runs || [];
      const lastOk = [...runs].reverse().find((r) => r.status === 'completed');
      if (!lastOk) {
        throwError('Chưa có kết quả AI hợp lệ để xác nhận. Vui lòng chạy phân tích trước.', 400);
      }
      inspection.ai_payload = lastOk.ai_payload || {};
      inspection.damage_detected = !!lastOk.damage_detected;
      inspection.severity = lastOk.severity || 'none';
      inspection.observations = Array.isArray(lastOk.observations) ? lastOk.observations : [];
      inspection.summary = lastOk.summary || '';
      inspection.conclusion = lastOk.conclusion || '';
      const disc = lastOk.ai_payload && typeof lastOk.ai_payload === 'object' ? lastOk.ai_payload.disclaimer : '';
      if (disc) inspection.disclaimer = disc;
    }

    inspection.published_to_renter = true;
    inspection.confirmed_by = userId;
    inspection.confirmed_at = new Date();
    inspection.ai_status = 'completed';
    await inspection.save();

    const b = await Booking.findById(bookingId);
    if (!b) throwError('Booking không tồn tại', 404);
    if (b.status !== 'waiting_return_confirmation') {
      return { inspection, booking: b };
    }
    b.status = 'completed';
    await b.save();
    await Vehicle.findByIdAndUpdate(b.vehicle_id, { status: 'available' });

    return { inspection, booking: b };
  }
}

module.exports = InspectionReturnReviewService;
