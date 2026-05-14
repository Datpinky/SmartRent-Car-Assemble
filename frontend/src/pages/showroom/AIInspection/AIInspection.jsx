import React, { useCallback, useEffect, useState } from 'react';
import { FaCamera, FaCheckCircle, FaHistory } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import bookingService from '../../../services/bookingService';
import inspectionService from '../../../services/inspectionService';
import uploadService from '../../../services/uploadService';
import vehicleService from '../../../services/vehicleService';
import { getRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import { POSITIONS, bookingCodeShort, makeInitialPosFiles } from './aiInspection.helpers';
import AnalysisResult from './components/AnalysisResult';
import ImageUploadStep from './components/ImageUploadStep';
import InspectionHistory from './components/InspectionHistory';
import VehicleSelector from './components/VehicleSelector';

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

  // Image files per position
  const [posFiles, setPosFiles] = useState(makeInitialPosFiles);

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

  // ── Derived values ──
  const hasBeforeForPos = (i, key) => !!(pickupImagesUrls[i] || posFiles[key].before);
  const validPositions = POSITIONS.filter((p, i) => hasBeforeForPos(i, p.key) && posFiles[p.key].after);
  const readyToAnalyze = validPositions.length >= 1;

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
        const bookings = await bookingService.getCurrentRoleBookings();
        const returnPhaseBookings = (bookings || []).filter((b) =>
          ['in_use', 'waiting_return_confirmation', 'completed'].includes(b.status),
        );
        fetchedVehicles = returnPhaseBookings
          .filter(
            (b, i, arr) =>
              arr.findIndex(
                (x) => String(x.vehicle_id?._id || x.vehicle_id) === String(b.vehicle_id?._id || b.vehicle_id),
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
        const all = await bookingService.getCurrentRoleBookings();
        // Filter by vehicle AND by inspection phase
        const allowedStatuses = isRenter
          ? ['in_use', 'waiting_return_confirmation', 'completed'] // Return phase for renter
          : ['waiting_handover', 'handed_over', 'in_use', 'completed']; // Pickup + completed (for trace back) for showroom
        const filtered = (all || []).filter(
          (b) => String(b.vehicle_id?._id || b.vehicle_id) === String(vehicleId) && allowedStatuses.includes(b.status),
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

  // ── Callbacks ──
  const setPosFile = (key, type, file) => setPosFiles((prev) => ({ ...prev, [key]: { ...prev[key], [type]: file } }));

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    setPosFiles(makeInitialPosFiles());
    fetchBookingsForVehicle(String(v._id || v.id));
  };

  const handleSelectBooking = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setPickupImagesUrls([]);
    setPosFiles(makeInitialPosFiles());
    if (!bookingId) return;
    try {
      console.log('🚀 handleSelectBooking START:', {
        bookingId,
        userRole: user?.role,
        isRenter,
        isShowroom,
      });

      // Start with showroom's pickup_images from booking
      const booking = await bookingService.getBookingById(bookingId);

      console.log('📋 BOOKING DATA FULL:', booking);
      console.log('📋 Selected booking:', {
        bookingId,
        hasPickupImages: !!booking?.pickup_images,
        pickupImagesLength: booking?.pickup_images?.length || 0,
        count: booking?.pickup_images?.filter(Boolean).length || 0,
      });

      let mergedImages = [];

      // ✅ PRIORITY 1: Load từ booking.pickup_images (từ handoff)
      if (Array.isArray(booking?.pickup_images) && booking.pickup_images.length > 0) {
        const validUrls = booking.pickup_images.filter((url) => url && typeof url === 'string' && url.trim());
        console.log('✅ Loaded', validUrls.length, 'valid images from booking.pickup_images');
        console.log('✅ URLs:', validUrls);
        mergedImages = validUrls;
      } else {
        console.log('⚠️ No pickup_images in booking');
      }

      // ✅ PRIORITY 1.5: Load từ localStorage (renter's checklist images) nếu là renter
      let checklistImages = [];
      if (isRenter) {
        try {
          const workflow = getRentalWorkflow(bookingId);
          checklistImages = workflow?.returnImages ? Object.values(workflow.returnImages).flat() : [];
          console.log('📝 Renter checklist images from localStorage:', {
            total: checklistImages.length,
            data: checklistImages,
            workflow,
          });
        } catch (err) {
          console.warn('Failed to load renter checklist images:', err);
        }
      }

      // Get vehicle ID for additional lookup
      const vehicleId = booking?.vehicle_id?._id || booking?.vehicle_id;

      // Load inspection records for this booking
      let inspections = [];
      try {
        const bookingResponse = await inspectionService.list({
          booking_id: bookingId,
          limit: 100,
        });
        console.log('🔍 Inspections by booking_id:', bookingResponse?.items?.length || 0);
        if (bookingResponse?.items && Array.isArray(bookingResponse.items)) {
          inspections = bookingResponse.items;
        }
      } catch (err) {
        console.warn('Failed to load inspections by booking_id:', err);
      }

      // If no inspections found by booking, try loading by vehicle + filter manually
      if (inspections.length === 0 && vehicleId) {
        try {
          const vehicleResponse = await inspectionService.list({
            vehicle_id: vehicleId,
            limit: 100,
          });
          console.log('🔍 Inspections by vehicle_id:', vehicleResponse?.items?.length || 0);
          if (vehicleResponse?.items && Array.isArray(vehicleResponse.items)) {
            // Filter to only this booking
            const filtered = vehicleResponse.items.filter((i) => {
              const iBookingId = String(i.booking_id?._id || i.booking_id || '');
              const match = iBookingId === String(bookingId);
              return match;
            });
            console.log('🔍 Filtered by booking:', filtered.length);
            inspections = filtered;
          }
        } catch (err) {
          console.warn('Failed to load inspections by vehicle_id:', err);
        }
      }

      // ✅ PRIORITY 2: Fill lỗ từ inspection records
      if (Array.isArray(inspections) && inspections.length > 0) {
        console.log('📸 Processing', inspections.length, 'inspections for filling gaps');
        inspections.forEach((inspection, idx) => {
          if (!Array.isArray(inspection.positions)) {
            console.warn(`Inspection ${idx} has no positions array`);
            return;
          }

          inspection.positions.forEach((pos) => {
            // Find the position index
            const posIdx = POSITIONS.findIndex((p) => p.key === pos.position_key || p.label === pos.position_label);
            if (posIdx < 0) {
              console.warn(`Position not found: key=${pos.position_key}, label=${pos.position_label}`);
              return;
            }

            if (isShowroom) {
              // 📌 SHOWROOM viewing:
              // - Load showroom's BEFORE images (pickup inspection)
              // - Load renter's AFTER images (return inspection) into posFiles for display
              if (inspection.inspected_by_role === 'renter' && inspection.inspection_type === 'return') {
                // Renter's return inspection - load AFTER images
                if (pos.after_url) {
                  console.log(`✅ Showroom sees renter's after_url for pos ${posIdx} (${pos.position_key})`);
                  setPosFile(pos.position_key, 'after', pos.after_url); // ← Store for display
                }
              } else if (inspection.inspection_type === 'pickup') {
                // Showroom's pickup inspection - load BEFORE images
                if (pos.before_url && !mergedImages[posIdx]) {
                  console.log(`✅ Filled pos ${posIdx} with showroom's before_url`);
                  mergedImages[posIdx] = pos.before_url;
                }
              }
            } else {
              // 📌 RENTER viewing:
              // - Load showroom's BEFORE images (pickup inspection) AND booking.pickup_images
              // - Load renter's AFTER images (return inspection) AND checklist images
              if (inspection.inspection_type === 'pickup') {
                // Showroom's pickup images - load BEFORE
                if (pos.before_url && !mergedImages[posIdx]) {
                  console.log(`✅ Renter sees showroom's before_url for pos ${posIdx}`);
                  mergedImages[posIdx] = pos.before_url;
                }
              } else if (inspection.inspected_by_role === 'renter' && inspection.inspection_type === 'return') {
                // Renter's own return images - load AFTER (from inspection record)
                if (pos.after_url && !mergedImages[posIdx]) {
                  console.log(`✅ Renter sees their own after_url (from inspection) for pos ${posIdx}`);
                  mergedImages[posIdx] = pos.after_url;
                }
              }
            }
          });
        });
      }

      // ✅ PRIORITY 3: Fill gaps từ renter's checklist images (localStorage)
      if (isRenter && checklistImages.length > 0) {
        console.log('🔄 Filling gaps from renter checklist images...');
        checklistImages.forEach((checklistImg, idx) => {
          if (idx < mergedImages.length && !mergedImages[idx] && checklistImg) {
            console.log(`✅ Filled pos ${idx} from checklist`);
            mergedImages[idx] = checklistImg;
          }
        });
        console.log('📝 After filling checklist:', {
          total: mergedImages.length,
          filled: mergedImages.filter(Boolean).length,
        });
      }

      console.log('✨ Final merged images:', {
        totalSlots: mergedImages.length,
        filledCount: mergedImages.filter(Boolean).length,
        urls: mergedImages,
      });

      // Đảm bảo array chứa đúng các URLs ở vị trí chính xác
      const finalImages = [];
      for (let i = 0; i < POSITIONS.length; i++) {
        finalImages[i] = mergedImages[i] || undefined;
      }

      console.log('✨ Final images state:', {
        length: finalImages.length,
        filled: finalImages.filter(Boolean).length,
        images: finalImages,
      });

      setPickupImagesUrls(finalImages);

      console.log('✅ handleSelectBooking COMPLETE:', {
        bookingId,
        userRole: user?.role,
        totalImages: finalImages.length,
        filledSlots: finalImages.filter(Boolean).length,
        sourceBreakdown: isRenter
          ? {
              fromBookingPickupImages: mergedImages.filter(Boolean).length,
              fromChecklistImages: checklistImages.length,
              fromInspectionRecords: inspections.length,
            }
          : 'showroom',
      });
    } catch (err) {
      console.error('Failed to load booking details:', err);
      setPickupImagesUrls([]);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setAnalyzed(false);
    setSelectedVehicle(null);
    setSelectedBookingId('');
    setBookings([]);
    setPickupImagesUrls([]);
    setPosFiles(makeInitialPosFiles());
    setAnalysisResult(null);
    setAnalysisError('');
    setSaveNote('');
  };

  const handleAnalyze = async () => {
    if (!readyToAnalyze) {
      const errorMsg = isShowroom
        ? 'Cần ít nhất một vị trí có ảnh TRƯỚC để bàn giao.'
        : 'Cần ít nhất một vị trí có đủ cả ảnh TRƯỚC và ảnh SAU.';
      void errorMsg;
      setAnalysisError(
        isShowroom
          ? 'Can it nhat mot vi tri co du anh TRUOC va anh SAU do renter upload de phan tich.'
          : 'Can it nhat mot vi tri co du ca anh TRUOC va anh SAU.',
      );
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
      const positionsInput = await Promise.all(
        validPositions.map(async (p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          let beforeFile = posFiles[p.key].before;
          let afterFile = posFiles[p.key].after;
          const afterUrl = typeof afterFile === 'string' ? afterFile : '';
          const pickupUrl = pickupImagesUrls[posIdx];
          if (!beforeFile && pickupUrl) {
            try {
              const resp = await fetch(pickupUrl);
              const blob = await resp.blob();
              beforeFile = new File([blob], `pickup_${p.key}.jpg`, { type: blob.type || 'image/jpeg' });
            } catch {
              /* keep null */
            }
          }
          if (afterUrl) {
            try {
              const resp = await fetch(afterUrl);
              const blob = await resp.blob();
              afterFile = new File([blob], `return_${p.key}.jpg`, { type: blob.type || 'image/jpeg' });
            } catch {
              afterFile = null;
            }
          }
          return { key: p.key, label: p.label, beforeFile, afterFile, afterUrl };
        }),
      );

      const analyzablePositions = positionsInput.filter((position) => position.beforeFile && position.afterFile);
      if (analyzablePositions.length === 0) {
        throw new Error('Can it nhat mot cap anh TRUOC + SAU hop le de phan tich.');
      }

      const data = await uploadService.compareMultiPosition(analyzablePositions);
      setAnalysisResult(data);

      // Upload files and record positions
      const positionsRecord = [];
      try {
        const filesToUpload = [];
        const uploadMap = [];
        analyzablePositions.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const hasPU = !!pickupImagesUrls[posIdx];
          if (!hasPU && p.beforeFile) {
            filesToUpload.push(p.beforeFile);
            uploadMap.push({ posKey: p.key, type: 'before' });
          }
          if (!p.afterUrl && p.afterFile) {
            filesToUpload.push(p.afterFile);
            uploadMap.push({ posKey: p.key, type: 'after' });
          }
        });
        const uploadedUrls = filesToUpload.length > 0 ? await uploadService.uploadImages(filesToUpload) : [];
        const urlByPosType = {};
        uploadMap.forEach((entry, i) => {
          urlByPosType[`${entry.posKey}_${entry.type}`] = uploadedUrls[i]?.url || '';
        });
        analyzablePositions.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const pickupUrl = pickupImagesUrls[posIdx] || '';
          positionsRecord.push({
            position_key: p.key,
            position_label: p.label,
            before_url: pickupUrl || urlByPosType[`${p.key}_before`] || '',
            after_url: p.afterUrl || urlByPosType[`${p.key}_after`] || '',
          });
        });
      } catch {
        setSaveNote('Không tải được ảnh lên lưu trữ.');
        analyzablePositions.forEach((p) => {
          positionsRecord.push({ position_key: p.key, position_label: p.label, before_url: '', after_url: '' });
        });
      }

      const vehicleName =
        selectedVehicle.vehicle_name ||
        [selectedVehicle.vehicle_brand, selectedVehicle.vehicle_model].filter(Boolean).join(' ');
      const selectedBooking = bookings.find((b) => String(b._id || b.id) === selectedBookingId);
      const bCode = selectedBooking ? bookingCodeShort(selectedBooking._id || selectedBooking.id) : '';

      try {
        await inspectionService.create({
          vehicle_id: selectedVehicle._id || selectedVehicle.id,
          booking_id: selectedBookingId || undefined,
          inspection_type: inspectionType, // 'pickup' or 'return'
          inspected_by_role: isRenter ? 'renter' : 'showroom',
          inspected_by_id: user._id,
          vehicle_name: vehicleName,
          vehicle_plate: selectedVehicle.vehicle_plate_number || '',
          booking_code: bCode,
          positions: positionsRecord,
          positions_analyzed: analyzablePositions.length,
          ai_payload: data || {},
          damage_detected: !!data?.damage_detected,
          severity: data?.severity || 'none',
          position_results: Array.isArray(data?.positions) ? data.positions : [],
        });
        setSaveNote((s) => `${s ? s + ' ' : ''}Đã lưu báo cáo kiểm tra.`.trim());
        fetchHistory();
      } catch (saveErr) {
        setSaveNote((s) =>
          `${s ? s + ' ' : ''}Phân tích xong nhưng không lưu được: ${saveErr.message || 'Lỗi server'}`.trim(),
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
              { n: 2, label: 'Tải ảnh (6 vị trí)' },
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
              posFiles={posFiles}
              onSetPosFile={setPosFile}
              validPositions={validPositions}
              readyToAnalyze={readyToAnalyze}
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
