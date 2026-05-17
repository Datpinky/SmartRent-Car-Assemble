import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCamera, FaCheckCircle, FaHistory } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import bookingService from '../../../services/bookingService';
import inspectionService from '../../../services/inspectionService';
import uploadService from '../../../services/uploadService';
import vehicleService from '../../../services/vehicleService';
import { getRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import { bookingCodeShort } from './aiInspection.helpers';
import AnalysisResult from './components/AnalysisResult';
import ImageUploadStep from './components/ImageUploadStep';
import InspectionHistory from './components/InspectionHistory';
import VehicleSelector from './components/VehicleSelector';

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const AIInspection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryBookingId = (searchParams.get('bookingId') || '').trim();

  const { user } = useAuth();
  const isShowroom = user?.role === 'showroom';
  const inspectionType = 'return';
  const [tab, setTab] = useState('new');
  const [step, setStep] = useState(1);

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [pickupImagesUrls, setPickupImagesUrls] = useState([]);
  const [returnImagesUrls, setReturnImagesUrls] = useState([]);
  const [returnReviewBooking, setReturnReviewBooking] = useState(null);
  const [returnReviewRenter, setReturnReviewRenter] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [saveNote, setSaveNote] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const [hydratedQuery, setHydratedQuery] = useState(false);

  const selectedBooking = useMemo(() => {
    if (returnReviewBooking && resolveId(returnReviewBooking) === String(selectedBookingId)) {
      return returnReviewBooking;
    }
    return bookings.find((b) => resolveId(b) === selectedBookingId) || null;
  }, [bookings, selectedBookingId, returnReviewBooking]);

  const isWaitingReturnReview = selectedBooking?.status === 'waiting_return_confirmation';
  const isCompletedBooking = selectedBooking?.status === 'completed';

  const fetchVehicles = useCallback(async () => {
    if (!user?._id || !isShowroom) {
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }
    setLoadingVehicles(true);
    try {
      const { data } = await vehicleService.getList({ added_by: user._id, limit: 80, page: 1 });
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [user?._id, isShowroom]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const fetchBookingsForVehicle = useCallback(async (vehicleId) => {
    setLoadingBookings(true);
    setBookings([]);
    try {
      const all = await bookingService.getCurrentRoleBookingsDetailed();
      const allowedStatuses = ['waiting_handover', 'handed_over', 'in_use', 'waiting_return_confirmation', 'completed'];
      const filtered = (all || []).filter(
        (b) => resolveId(b.vehicle_id) === String(vehicleId) && allowedStatuses.includes(b.status),
      );
      setBookings(filtered);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { items } = await inspectionService.list({ limit: 50, page: 1 });
      setHistoryRows(items || []);
    } catch {
      setHistoryRows([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  const normalizeUrlList = (value) =>
    (Array.isArray(value) ? value : [])
      .map((url) => (typeof url === 'string' ? url.trim() : ''))
      .filter(Boolean)
      .slice(0, 6);

  useEffect(() => {
    if (!isShowroom || !queryBookingId) {
      setHydratedQuery(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await inspectionService.getReturnReview(queryBookingId);
        if (cancelled || !data) return;

        const v = data.vehicle;
        setReturnReviewBooking(data.booking);
        setReturnReviewRenter(data.renter || null);
        setSelectedVehicle(v || null);
        setSelectedBookingId(queryBookingId);
        setPickupImagesUrls(normalizeUrlList(data.pickup_images));
        setReturnImagesUrls(normalizeUrlList(data.return_images));

        const draft = data.latest_draft_run;
        if (data.booking?.status === 'completed' && data.latest_official?.ai_payload) {
          setAnalysisResult(data.latest_official.ai_payload);
          setAnalyzed(true);
          setStep(3);
        } else if (draft?.status === 'completed' && draft.ai_payload) {
          setAnalysisResult(draft.ai_payload);
          setAnalyzed(true);
          setStep(3);
        } else {
          setAnalysisResult(null);
          setAnalyzed(false);
          setStep(2);
        }
        setSaveNote('');
        setAnalysisError('');

        if (data.booking?.status === 'completed') {
          setSaveNote('Đơn đặt xe đã hoàn tất. Bạn vẫn có thể xem lịch sử chạy AI trên server nếu có.');
        }
      } catch (e) {
        if (!cancelled) {
          setAnalysisError(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu kiểm tra trả xe.');
          setStep(1);
        }
      } finally {
        if (!cancelled) setHydratedQuery(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isShowroom, queryBookingId]);

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    setReturnReviewBooking(null);
    setReturnReviewRenter(null);
    fetchBookingsForVehicle(String(v._id || v.id));
  };

  const handleSelectBooking = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    setReturnReviewBooking(null);
    setReturnReviewRenter(null);
    if (!bookingId) return;

    try {
      const booking = await bookingService.getBookingById(bookingId);
      const renterFromBooking =
        booking?.user_id && typeof booking.user_id === 'object' ? booking.user_id : null;
      const pickupImages = normalizeUrlList(booking?.pickup_images);
      let returnImages = [];

      if (booking?.status === 'waiting_return_confirmation') {
        try {
          const review = await inspectionService.getReturnReview(bookingId);
          setReturnReviewBooking(review?.booking || booking);
          setReturnReviewRenter(review?.renter || renterFromBooking);
          returnImages = normalizeUrlList(review?.return_images);
        } catch {
          setReturnReviewBooking(booking);
          setReturnReviewRenter(renterFromBooking);
          try {
            const { items } = await inspectionService.list({
              booking_id: bookingId,
              inspection_type: 'return',
              limit: 10,
            });
            const latestWithReturnImages = (items || []).find(
              (inspection) => Array.isArray(inspection.return_images) && inspection.return_images.length > 0,
            );
            if (latestWithReturnImages) {
              returnImages = normalizeUrlList(latestWithReturnImages.return_images);
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        setReturnReviewRenter(renterFromBooking);
        try {
          const workflow = getRentalWorkflow(bookingId);
          returnImages = normalizeUrlList(workflow?.returnImages);
        } catch {
          /* ignore */
        }
      }

      setPickupImagesUrls(pickupImages);
      setReturnImagesUrls(returnImages);
    } catch (err) {
      console.error('Failed to load booking details:', err);
      setPickupImagesUrls([]);
      setReturnImagesUrls([]);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setAnalyzed(false);
    setSelectedVehicle(null);
    setSelectedBookingId('');
    setBookings([]);
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    setReturnReviewBooking(null);
    setReturnReviewRenter(null);
    setAnalysisResult(null);
    setAnalysisError('');
    setSaveNote('');
    if (queryBookingId) {
      navigate('/showroom/ai-inspection', { replace: true });
    }
  };

  const runServerReturnAnalyze = async () => {
    if (!selectedBookingId) return;
    setAnalyzing(true);
    setAnalysisError('');
    setSaveNote('');
    try {
      const data = await inspectionService.analyzeReturnReview(selectedBookingId);
      setAnalysisResult(data);
      setAnalyzed(true);
      setStep(3);
      setSaveNote('Đã lưu kết quả lần chạy AI (chưa công bố cho khách).');
    } catch (err) {
      setAnalysisError(err?.response?.data?.message || err.message || 'Phân tích thất bại.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async (galleryImages) => {
    if (selectedBooking?.status === 'waiting_return_confirmation') {
      if (!returnImagesUrls.length) {
        setAnalysisError('Chưa có ảnh trả xe từ khách thuê.');
        return;
      }
      await runServerReturnAnalyze();
      return;
    }

    if (isCompletedBooking) {
      setAnalysisError('Đơn đã hoàn tất — không thể chạy phân tích trả xe.');
      return;
    }

    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
      setAnalysisError('Cần ít nhất một ảnh để phân tích.');
      return;
    }
    if (!selectedVehicle) {
      setAnalysisError('Vui lòng chọn xe ở bước 1.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');
    setSaveNote('');

    try {
      const toAnalysisImage = async (img, idx, prefix) => {
        if (img.type === 'file' && img.data instanceof File) return img;
        if (img.type === 'url' && typeof img.data === 'string') {
          try {
            const resp = await fetch(img.data);
            const blob = await resp.blob();
            return {
              type: 'file',
              data: new File([blob], `${prefix}_${idx}.jpg`, { type: blob.type || 'image/jpeg' }),
            };
          } catch {
            return null;
          }
        }
        return null;
      };

      const rawAfterImages = galleryImages.slice(0, 6);
      const afterImages = (
        await Promise.all(rawAfterImages.map((img, idx) => toAnalysisImage(img, idx, 'after')))
      ).filter(Boolean);
      const beforeImages = (
        await Promise.all(
          pickupImagesUrls
            .filter(Boolean)
            .slice(0, 6)
            .map((url, idx) => toAnalysisImage({ type: 'url', data: url }, idx, 'before')),
        )
      ).filter(Boolean);
      if (afterImages.length === 0) {
        throw new Error('Không có ảnh hợp lệ để phân tích.');
      }

      const data =
        beforeImages.length > 0
          ? await uploadService.compareBeforeAfterGallery(beforeImages, afterImages)
          : await uploadService.compareGalleryImages(afterImages);
      setAnalysisResult(data);

      const existingAfterUrls = rawAfterImages
        .filter((img) => img.type === 'url' && typeof img.data === 'string')
        .map((img) => img.data);
      const filesToUpload = rawAfterImages
        .filter((img) => img.type === 'file' && img.data instanceof File)
        .map((img) => img.data);

      let uploadedUrls = [];
      if (filesToUpload.length > 0) {
        try {
          uploadedUrls = await uploadService.uploadImages(filesToUpload);
        } catch {
          setSaveNote('Không tải được ảnh lên lưu trữ.');
        }
      }

      const returnImageRecord = [
        ...existingAfterUrls,
        ...uploadedUrls.map((item) => item.url || item).filter(Boolean),
      ].slice(0, 6);

      const vehicleName =
        selectedVehicle.vehicle_name ||
        [selectedVehicle.vehicle_brand, selectedVehicle.vehicle_model].filter(Boolean).join(' ');
      const selBooking = bookings.find((b) => resolveId(b) === selectedBookingId);
      const bCode = selBooking ? bookingCodeShort(selBooking._id || selBooking.id) : '';

      try {
        await inspectionService.create({
          vehicle_id: resolveId(selectedVehicle),
          booking_id: selectedBookingId || undefined,
          inspection_type: inspectionType,
          inspected_by_role: 'showroom',
          inspected_by_id: user._id,
          vehicle_name: vehicleName,
          vehicle_plate: selectedVehicle.vehicle_plate_number || selBooking?.vehicle_plate || '',
          booking_code: bCode,
          pickup_images: pickupImagesUrls.filter(Boolean).slice(0, 6),
          return_images: returnImageRecord,
          gallery_images: returnImageRecord,
          gallery_analyzed: afterImages.length,
          ai_payload: data || {},
          damage_detected: !!data?.damage_detected,
          severity: data?.severity || 'none',
          observations: Array.isArray(data?.observations) ? data.observations : [],
          summary: data?.summary || '',
          conclusion: data?.conclusion || '',
          disclaimer: data?.disclaimer || '',
          comparison_mode: beforeImages.length > 0 ? 'gallery' : 'current_only',
        });
        setSaveNote((s) => (s ? `${s} ` : '') + 'Đã lưu báo cáo kiểm tra.');
        fetchHistory();
      } catch (saveErr) {
        setSaveNote((s) =>
          ((s ? `${s} ` : '') + 'Phân tích xong nhưng không lưu được: ' + (saveErr.message || 'lỗi server')).trim(),
        );
      }

      setAnalyzed(true);
      setStep(3);
    } catch (err) {
      setAnalysisError(err.message || 'Phân tích thất bại. Vui lòng thử lại.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmPublished = async () => {
    if (!selectedBookingId || !isWaitingReturnReview) return;
    setConfirming(true);
    setAnalysisError('');
    try {
      await inspectionService.confirmReturnReview(selectedBookingId, { manual: false });
      navigate('/showroom/bookings');
    } catch (err) {
      setAnalysisError(err?.response?.data?.message || err.message || 'Không thể xác nhận.');
    } finally {
      setConfirming(false);
    }
  };

  const step1Done = Boolean(queryBookingId && hydratedQuery && selectedBookingId && step >= 2);

  if (!isShowroom) {
    return (
      <div className="max-w-[900px] mx-auto p-6 text-center text-gray-600">
        Trang này chỉ dành cho showroom.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[900px]">
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Kiểm tra AI — Showroom</h1>
          <p className="page-subtitle">
            So sánh ảnh bàn giao (BEFORE) và ảnh trả xe (AFTER). Chỉ showroom được chạy AI; kết quả chỉ hiển thị cho
            khách sau khi bạn xác nhận.
          </p>
        </div>
      </div>

      <div className="mb-5 flex max-w-full flex-wrap gap-2">
        {[
          { key: 'new', icon: <FaCamera aria-hidden />, label: 'Kiểm tra mới' },
          { key: 'history', icon: <FaHistory aria-hidden />, label: 'Lịch sử kiểm tra' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-semibold cursor-pointer transition-colors ${
              tab === key
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div>
          <div className="mb-6 flex max-w-full min-w-0 items-center overflow-x-auto rounded-xl border border-gray-200 bg-white px-3 py-3.5 sm:px-5 [scrollbar-width:thin]">
            {[
              { n: 1, label: 'Chọn xe & đơn đặt xe' },
              { n: 2, label: 'Kiểm tra ảnh trả xe' },
              { n: 3, label: 'Kết quả AI' },
            ].map(({ n, label }, i) => {
              const done = queryBookingId ? step > n || (n === 1 && step1Done) : step > n;
              const active = queryBookingId ? step >= n || (n === 1 && step >= 2) : step >= n;
              return (
                <React.Fragment key={n}>
                  <div className="flex shrink-0 items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        done
                          ? 'bg-green-500 text-white'
                          : active
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {done ? <FaCheckCircle className="text-[0.9rem]" /> : n}
                    </div>
                    <span
                      className={`max-w-[9rem] text-[0.82rem] sm:max-w-none sm:whitespace-nowrap ${active ? 'font-bold text-gray-900' : 'text-gray-400'}`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`mx-2 h-0.5 min-w-[24px] shrink-0 sm:mx-2.5 sm:min-w-[40px] ${step > n + 1 ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {step === 1 && !(queryBookingId && hydratedQuery && step >= 2) && (
            <VehicleSelector
              vehicles={vehicles}
              loadingVehicles={loadingVehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              bookings={bookings}
              loadingBookings={loadingBookings}
              selectedBookingId={selectedBookingId}
              onSelectBooking={handleSelectBooking}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <>
              {(returnReviewRenter || selectedBookingId) && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[0.85rem] text-slate-800">
                  <div className="font-bold text-slate-900 mb-1">Thông tin đơn & khách thuê</div>
                  {selectedBookingId && (
                    <div>
                      Mã booking:{' '}
                      <span className="font-mono font-semibold">
                        BK{String(selectedBookingId).slice(-6).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {(returnReviewRenter?.name || returnReviewRenter?.email || returnReviewRenter?.full_name) && (
                    <div>
                      Khách thuê:{' '}
                      <strong>{returnReviewRenter?.name || returnReviewRenter?.full_name || '—'}</strong>
                      {returnReviewRenter?.email ? (
                        <span className="text-slate-600"> ({returnReviewRenter.email})</span>
                      ) : null}
                    </div>
                  )}
                  {selectedVehicle && (
                    <div>
                      Xe:{' '}
                      <strong>
                        {selectedVehicle.vehicle_name ||
                          [selectedVehicle.vehicle_brand, selectedVehicle.vehicle_model].filter(Boolean).join(' ') ||
                          '—'}
                      </strong>
                    </div>
                  )}
                </div>
              )}
              <ImageUploadStep
                selectedVehicle={selectedVehicle}
                selectedBookingId={selectedBookingId}
                bookings={bookings}
                pickupImagesUrls={pickupImagesUrls}
                initialImages={returnImagesUrls}
                analyzing={analyzing}
                analysisError={analysisError}
                isShowroom
                lockReturnUploads={isWaitingReturnReview}
                onBack={() => {
                  if (queryBookingId) {
                    navigate('/showroom/bookings');
                    return;
                  }
                  setStep(1);
                  setAnalysisError('');
                }}
                onAnalyze={handleAnalyze}
              />
            </>
          )}

          {step === 3 && analyzed && analysisResult && (
            <AnalysisResult
              mode={isWaitingReturnReview && !isCompletedBooking ? 'showroom-return' : 'default'}
              analysisResult={analysisResult}
              saveNote={saveNote}
              pickupImageUrls={pickupImagesUrls}
              afterImageUrls={returnImagesUrls}
              analyzing={analyzing}
              confirming={confirming}
              onConfirm={isWaitingReturnReview && !isCompletedBooking ? handleConfirmPublished : undefined}
              onReset={
                isWaitingReturnReview && !isCompletedBooking
                  ? () => {
                      setStep(2);
                      setAnalyzed(false);
                    }
                  : resetFlow
              }
            />
          )}
        </div>
      )}

      {tab === 'history' && (
        <InspectionHistory
          historyRows={historyRows}
          loadingHistory={loadingHistory}
          expandedRow={expandedRow}
          onToggleRow={(id) => setExpandedRow((prev) => (prev === id ? null : id))}
        />
      )}
    </div>
  );
};

export default AIInspection;
