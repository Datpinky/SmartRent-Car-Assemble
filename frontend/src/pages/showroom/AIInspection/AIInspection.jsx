import React, { useCallback, useEffect, useState } from 'react';
import { FaCamera, FaCheckCircle, FaHistory } from 'react-icons/fa';
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
  const { user } = useAuth();
  const isShowroom = user?.role === 'showroom';
  const isRenter = user?.role === 'renter';
  const inspectionType = 'return';
  const [tab, setTab] = useState('new');
  const [step, setStep] = useState(1);

  // Vehicles + bookings
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [pickupImagesUrls, setPickupImagesUrls] = useState([]);
  const [returnImagesUrls, setReturnImagesUrls] = useState([]);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [saveNote, setSaveNote] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  // History
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Data fetching ──
  const fetchVehicles = useCallback(async () => {
    if (!user?._id) {
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }
    setLoadingVehicles(true);
    try {
      // For showroom: fetch vehicles they added. For renter: fetch from their active/recent bookings
      let fetchedVehicles = [];
      if (isShowroom) {
        const { data } = await vehicleService.getList({ added_by: user._id, limit: 80, page: 1 });
        fetchedVehicles = Array.isArray(data) ? data : [];
      } else if (isRenter) {
        // Get unique vehicles from renter's bookings in return phase
        const bookings = await bookingService.getCurrentRoleBookingsDetailed();
        const returnPhaseBookings = (bookings || []).filter((b) =>
          ['in_use', 'waiting_return_confirmation', 'completed'].includes(b.status),
        );
        fetchedVehicles = returnPhaseBookings
          .filter(
            (b, i, arr) =>
              arr.findIndex(
                (x) => resolveId(x.vehicle_id) === resolveId(b.vehicle_id),
              ) === i,
          )
          .map((b) => b.vehicle_id)
          .filter(Boolean);
      }
      setVehicles(fetchedVehicles);
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [user?._id, isRenter, isShowroom]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const fetchBookingsForVehicle = useCallback(
    async (vehicleId) => {
      setLoadingBookings(true);
      setBookings([]);
      try {
        const all = await bookingService.getCurrentRoleBookingsDetailed();
        // Filter by vehicle AND by inspection phase
        const allowedStatuses = isRenter
          ? ['in_use', 'waiting_return_confirmation', 'completed'] // Return phase for renter
          : ['waiting_handover', 'handed_over', 'in_use', 'completed']; // Pickup + completed (for trace back) for showroom
        const filtered = (all || []).filter(
          (b) => resolveId(b.vehicle_id) === String(vehicleId) && allowedStatuses.includes(b.status),
        );
        setBookings(filtered);
      } catch {
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    },
    [isRenter],
  );

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

  // ?? Callbacks ??
  const normalizeUrlList = (value) =>
    (Array.isArray(value) ? value : [])
      .map((url) => (typeof url === 'string' ? url.trim() : ''))
      .filter(Boolean)
      .slice(0, 6);

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    fetchBookingsForVehicle(String(v._id || v.id));
  };

  const handleSelectBooking = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    if (!bookingId) return;

    try {
      const booking = await bookingService.getBookingById(bookingId);
      const pickupImages = normalizeUrlList(booking?.pickup_images);
      let returnImages = [];

      try {
        const workflow = getRentalWorkflow(bookingId);
        returnImages = normalizeUrlList(workflow?.returnImages);
      } catch (err) {
        console.warn('Failed to load return images from localStorage:', err);
      }

      try {
        const { items } = await inspectionService.list({
          booking_id: bookingId,
          inspection_type: 'return',
          limit: 20,
        });
        const latestWithReturnImages = (items || []).find(
          (inspection) => Array.isArray(inspection.return_images) && inspection.return_images.length > 0,
        );
        if (latestWithReturnImages) {
          returnImages = normalizeUrlList(latestWithReturnImages.return_images);
        }
      } catch (err) {
        console.warn('Failed to load return inspection gallery:', err);
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
    setAnalysisResult(null);
    setAnalysisError('');
    setSaveNote('');
  };

  const handleAnalyze = async (galleryImages) => {
    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
      setAnalysisError('Can it nhat mot anh tra xe de phan tich.');
      return;
    }
    if (!selectedVehicle) {
      setAnalysisError('Vui long chon xe o buoc 1.');
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
            return { type: 'file', data: new File([blob], `${prefix}_${idx}.jpg`, { type: blob.type || 'image/jpeg' }) };
          } catch {
            return null;
          }
        }
        return null;
      };

      const rawAfterImages = galleryImages.slice(0, 6);
      const afterImages = (await Promise.all(rawAfterImages.map((img, idx) => toAnalysisImage(img, idx, 'after')))).filter(Boolean);
      const beforeImages = (
        await Promise.all(
          pickupImagesUrls
            .filter(Boolean)
            .slice(0, 6)
            .map((url, idx) => toAnalysisImage({ type: 'url', data: url }, idx, 'before')),
        )
      ).filter(Boolean);
      if (afterImages.length === 0) {
        throw new Error('Khong co anh hop le de phan tich.');
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
        } catch (err) {
          setSaveNote('Khong tai duoc anh len luu tru.');
        }
      }

      const returnImageRecord = [
        ...existingAfterUrls,
        ...uploadedUrls.map((item) => item.url || item).filter(Boolean),
      ].slice(0, 6);

      const vehicleName =
        selectedVehicle.vehicle_name ||
        [selectedVehicle.vehicle_brand, selectedVehicle.vehicle_model].filter(Boolean).join(' ');
      const selectedBooking = bookings.find((b) => resolveId(b) === selectedBookingId);
      const bCode = selectedBooking ? bookingCodeShort(selectedBooking._id || selectedBooking.id) : '';

      try {
        await inspectionService.create({
          vehicle_id: resolveId(selectedVehicle),
          booking_id: selectedBookingId || undefined,
          inspection_type: inspectionType,
          inspected_by_role: isRenter ? 'renter' : 'showroom',
          inspected_by_id: user._id,
          vehicle_name: vehicleName,
          vehicle_plate: selectedVehicle.vehicle_plate_number || selectedBooking?.vehicle_plate || '',
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
        setSaveNote((s) => (s ? s + ' ' : '') + 'Da luu bao cao kiem tra.');
        fetchHistory();
      } catch (saveErr) {
        setSaveNote((s) =>
          ((s ? s + ' ' : '') + 'Phan tich xong nhung khong luu duoc: ' + (saveErr.message || 'Loi server')).trim(),
        );
      }

      setAnalyzed(true);
      setStep(3);
    } catch (err) {
      setAnalysisError(err.message || 'Phan tich that bai. Vui long thu lai.');
    } finally {
      setAnalyzing(false);
    }
  };


  return (
    <div className="max-w-[900px] mx-auto">
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">
            {isRenter ? 'Kiểm tra AI — Xe trả về (Kiểm tra hướng' : 'Kiểm tra AI — Xe bàn giao'}
          </h1>
          <p className="page-subtitle">
            {isRenter
              ? 'Tải ảnh hướng và nhận ảnh để phát hiện hư hỏng và tình trạng'
              : 'Upload ảnh xe trước khi bàn giao cho khách thuê. Ảnh này sẽ dùng để so sánh khi xe trả về.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'new', icon: <FaCamera aria-hidden />, label: 'Kiểm tra mới' },
          { key: 'history', icon: <FaHistory aria-hidden />, label: 'Lịch sử kiểm tra' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm border-2 cursor-pointer transition-colors ${
              tab === key
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── New inspection tab ── */}
      {tab === 'new' && (
        <div>
          {/* Step indicator */}
          <div className="flex items-center mb-6 bg-white rounded-xl px-5 py-3.5 border border-gray-200">
            {[
              { n: 1, label: 'Chọn xe & đơn đặt xe' },
              { n: 2, label: 'Tải ảnh trả xe' },
              { n: 3, label: 'Kết quả AI' },
            ].map(({ n, label }, i) => {
              const done = step > n;
              const active = step >= n;
              return (
                <React.Fragment key={n}>
                  <div className="flex items-center gap-2">
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
                      className={`text-[0.82rem] whitespace-nowrap ${active ? 'font-bold text-gray-900' : 'text-gray-400'}`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 mx-2.5 ${step > n + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {step === 1 && (
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
            <ImageUploadStep
              selectedVehicle={selectedVehicle}
              selectedBookingId={selectedBookingId}
              bookings={bookings}
              pickupImagesUrls={pickupImagesUrls}
              initialImages={returnImagesUrls}
              analyzing={analyzing}
              analysisError={analysisError}
              isShowroom={isShowroom}
              onBack={() => {
                setStep(1);
                setAnalysisError('');
              }}
              onAnalyze={handleAnalyze}
            />
          )}

          {step === 3 && analyzed && analysisResult && (
            <AnalysisResult analysisResult={analysisResult} saveNote={saveNote} onReset={resetFlow} />
          )}
        </div>
      )}

      {/* ── History tab ── */}
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
