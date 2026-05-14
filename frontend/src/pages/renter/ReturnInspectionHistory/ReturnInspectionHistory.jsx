import { useCallback, useEffect, useState } from 'react';
import {
  FaCamera,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaHistory,
  FaInfoCircle,
  FaSpinner,
} from 'react-icons/fa';
import bookingService from '../../../services/bookingService';
import inspectionService from '../../../services/inspectionService';
import uploadService from '../../../services/uploadService';
import { getRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import { POSITIONS } from '../../showroom/AIInspection/aiInspection.helpers';
import ReturnImageUploadStep from './components/ReturnImageUploadStep';

const fmtDate = (d) =>
  d
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(d))
    : '—';

const severityToBadge = (sev) => {
  if (sev === 'severe') return 'rejected';
  if (sev === 'moderate') return 'pending';
  if (sev === 'minor') return 'new';
  return 'available';
};

const SEVERITY_LABEL = {
  none: 'Không đáng kể',
  minor: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nặng',
};

const makeInitialPosFiles = () => Object.fromEntries(POSITIONS.map((p) => [p.key, { after: null }]));

const ReturnInspectionHistory = () => {
  const [tab, setTab] = useState('new');
  const [step, setStep] = useState(1);

  // New inspection state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [pickupImagesUrls, setPickupImagesUrls] = useState([]); // ảnh từ showroom
  const [posFiles, setPosFiles] = useState(makeInitialPosFiles);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [saveNote, setSaveNote] = useState('');

  // History state
  const [historyRows, setHistoryRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Derived values ──
  const selectedBooking = bookings.find((b) => String(b._id || b.id) === selectedBookingId);
  const hasSomeShowroomImages = pickupImagesUrls.some((url) => !!url);
  const validPositions = POSITIONS.filter((p) => {
    const files = posFiles[p.key];
    return !!files?.after;
  });
  const readyToAnalyze = validPositions.length >= 1;

  // ── Fetch bookings for return phase ──
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const all = await bookingService.getCurrentRoleBookings();
      // Filter only completed bookings
      const completed = (all || []).filter((b) => b.status === 'completed');
      setBookings(completed);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // ── Load pickup images from selected booking + renter's return images ──
  const loadPickupImages = useCallback(async (bookingId) => {
    setPickupImagesUrls([]);
    if (!bookingId) return;
    try {
      console.log('🔍 loadPickupImages START for booking:', bookingId);

      // Load from booking API (showroom images)
      const booking = await bookingService.getBookingById(bookingId);
      console.log('📋 Full booking object:', booking);
      const bookingImages = booking?.pickup_images || [];
      console.log('📦 Loaded from booking.pickup_images:', {
        count: bookingImages.length,
        images: bookingImages,
        bookingStatus: booking?.status,
        hasPickupImagesField: 'pickup_images' in booking,
      });

      // Load from localStorage (checklist images uploaded by renter)
      const workflow = getRentalWorkflow(bookingId);
      console.log('💾 Raw localStorage workflow:', workflow);
      console.log('💾 workflow.returnImages structure:', {
        type: typeof workflow?.returnImages,
        isArray: Array.isArray(workflow?.returnImages),
        isObject: typeof workflow?.returnImages === 'object',
        keys: workflow?.returnImages ? Object.keys(workflow.returnImages) : 'N/A',
        rawData: workflow?.returnImages,
      });
      const checklistImages = workflow?.returnImages
        ? Array.isArray(workflow.returnImages)
          ? workflow.returnImages
          : Object.values(workflow.returnImages).flat()
        : [];
      console.log('📝 Loaded from localStorage (workflow):', {
        count: checklistImages.length,
        images: checklistImages,
        rawWorkflow: workflow,
      });

      // Load renter's inspection record (return inspection) to get uploaded after_urls
      let returnInspectionImages = [];
      try {
        console.log('🔍 Querying inspections with params:', {
          booking_id: bookingId,
          inspection_type: 'return',
          limit: 1,
        });
        const { items } = await inspectionService.list({
          booking_id: bookingId,
          inspection_type: 'return',
          limit: 1,
        });
        console.log('🔍 Inspection query result:', items?.length || 0, 'inspections', 'Full items:', items);
        if (items && items.length > 0) {
          const returnInspection = items[0];
          if (Array.isArray(returnInspection.positions)) {
            // Extract after_urls from inspection positions
            const inspectionImages = new Array(POSITIONS.length);
            returnInspection.positions.forEach((pos) => {
              const posIdx = POSITIONS.findIndex((p) => p.key === pos.position_key);
              if (posIdx >= 0 && pos.after_url) {
                inspectionImages[posIdx] = pos.after_url;
              }
            });
            returnInspectionImages = inspectionImages;
            console.log('✅ Loaded renter return inspection images:', {
              count: returnInspectionImages.filter(Boolean).length,
              images: returnInspectionImages,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load return inspection:', err);
      }

      // Merge: booking images (showroom handoff) + prefer inspection images over localStorage
      const mergedImages = [];
      for (let i = 0; i < POSITIONS.length; i++) {
        // Priority: inspection images (uploaded) > localStorage > booking images
        mergedImages[i] = returnInspectionImages[i] || checklistImages[i] || bookingImages[i] || '';
      }

      console.log('✨ loadPickupImages COMPLETE:', {
        bookingId,
        totalSlots: mergedImages.length,
        filled: mergedImages.filter(Boolean).length,
        breakdown: {
          fromBooking: bookingImages.length,
          fromChecklist: checklistImages.length,
          fromInspection: returnInspectionImages.filter(Boolean).length,
        },
        images: mergedImages,
      });

      setPickupImagesUrls(Array.isArray(mergedImages) ? mergedImages : []);
    } catch (err) {
      console.error('🚨 loadPickupImages ERROR:', err);
      setPickupImagesUrls([]);
    }
  }, []);

  // ── Fetch inspection history ──
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { items } = await inspectionService.list({
        page: 1,
        limit: 50,
        inspection_type: 'return',
      });
      setHistoryRows(Array.isArray(items) ? items : []);
    } catch {
      setHistoryRows([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ── Reset flow ──
  const resetFlow = () => {
    setStep(1);
    setAnalyzed(false);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    setPosFiles(makeInitialPosFiles());
    setAnalysisResult(null);
    setAnalysisError('');
    setSaveNote('');
  };

  // ── Set pos file ──
  const setPosFile = (key, type, file) => {
    setPosFiles((prev) => ({
      ...prev,
      [key]: { ...prev[key], [type]: file },
    }));
  };

  // ── Main analyze handler ──
  const handleAnalyze = async () => {
    if (!selectedBooking || !selectedBookingId) {
      setAnalysisError('Vui lòng chọn booking.');
      return;
    }
    if (!readyToAnalyze) {
      setAnalysisError('Cần ít nhất một vị trí có ảnh.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');
    setSaveNote('');

    try {
      let analysisData = null;

      // Only call AI if showroom has uploaded before images
      if (hasSomeShowroomImages) {
        // Collect files to compare
        const positionsInput = await Promise.all(
          validPositions.map(async (p) => {
            const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
            let beforeFile = posFiles[p.key].before;
            const pickupUrl = pickupImagesUrls[posIdx];

            // Fetch showroom image if available
            if (!beforeFile && pickupUrl) {
              try {
                const resp = await fetch(pickupUrl);
                const blob = await resp.blob();
                beforeFile = new File([blob], `pickup_${p.key}.jpg`, { type: blob.type || 'image/jpeg' });
              } catch {
                /* keep null */
              }
            }

            return {
              key: p.key,
              label: p.label,
              beforeFile,
              afterFile: posFiles[p.key].after,
            };
          }),
        );

        // Call AI comparison
        analysisData = await uploadService.compareMultiPosition(positionsInput);
        setAnalysisResult(analysisData);
      }

      // Upload files
      const positionsRecord = [];
      try {
        const filesToUpload = [];
        const uploadMap = [];

        validPositions.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const pickupUrl = pickupImagesUrls[posIdx];

          // Upload before image if not from showroom
          if (!pickupUrl && posFiles[p.key].before) {
            filesToUpload.push(posFiles[p.key].before);
            uploadMap.push({ posKey: p.key, type: 'before' });
          }

          // Upload after image
          if (posFiles[p.key].after) {
            filesToUpload.push(posFiles[p.key].after);
            uploadMap.push({ posKey: p.key, type: 'after' });
          }
        });

        const uploadedUrls = filesToUpload.length > 0 ? await uploadService.uploadImages(filesToUpload) : [];
        const urlByPosType = {};
        uploadMap.forEach((entry, i) => {
          urlByPosType[`${entry.posKey}_${entry.type}`] = uploadedUrls[i]?.url || '';
        });

        // Build positions record
        validPositions.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const beforeUrl = pickupImagesUrls[posIdx] || urlByPosType[`${p.key}_before`] || '';
          const afterUrl = urlByPosType[`${p.key}_after`] || '';

          positionsRecord.push({
            position_key: p.key,
            position_label: p.label,
            before_url: beforeUrl,
            after_url: afterUrl,
          });
        });
      } catch {
        setSaveNote('Không tải được ảnh lên lưu trữ.');
        validPositions.forEach((p) => {
          positionsRecord.push({
            position_key: p.key,
            position_label: p.label,
            before_url: '',
            after_url: '',
          });
        });
      }

      // Save inspection record
      const bookingCodeShort = (id) => (id ? `BK${String(id).slice(-6).toUpperCase()}` : '');
      const bCode = bookingCodeShort(selectedBookingId);
      const vehicleName =
        selectedBooking?.vehicleName ||
        selectedBooking?.vehicle_name ||
        selectedBooking?.vehicle_id?.vehicle_name ||
        'Xe';

      await inspectionService.create({
        vehicle_id: selectedBooking.vehicle_id?._id || selectedBooking.vehicle_id?.id,
        booking_id: selectedBookingId,
        inspection_type: 'return',
        inspected_by_role: 'renter',
        vehicle_name: vehicleName,
        vehicle_plate: selectedBooking.vehicle_plate || selectedBooking.plate || '',
        booking_code: bCode,
        positions: positionsRecord,
        positions_analyzed: validPositions.length,
        ai_payload: analysisData || {},
        damage_detected: !!analysisData?.damage_detected,
        severity: analysisData?.severity || 'none',
        position_results: Array.isArray(analysisData?.positions) ? analysisData.positions : [],
      });

      setSaveNote(
        hasSomeShowroomImages
          ? 'Đã lưu báo cáo kiểm tra AI.'
          : 'Đã lưu báo cáo kiểm tra (chứng cứ hình ảnh). AI không khả dụng vì chưa có ảnh trước.',
      );
      setAnalyzed(true);
      setStep(3);
    } catch (err) {
      setAnalysisError(err?.message || 'Phân tích thất bại. Vui lòng thử lại.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (tab === 'new') fetchBookings();
    if (tab === 'history') fetchHistory();
  }, [tab, fetchBookings, fetchHistory]);

  // Load pickup images when booking is selected
  useEffect(() => {
    if (selectedBookingId) {
      console.log('📋 useEffect: selectedBookingId changed, calling loadPickupImages:', selectedBookingId);
      loadPickupImages(selectedBookingId);
    }
  }, [selectedBookingId, loadPickupImages]);

  const getSeverityBadge = (severity) => {
    const badgeType = severityToBadge(severity);
    const colors = {
      rejected: { bg: '#fee2e2', text: '#b91c1c', label: 'Nặng' },
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Trung bình' },
      new: { bg: '#dbeafe', text: '#1d4ed8', label: 'Nhẹ' },
      available: { bg: '#ecfdf5', text: '#059669', label: 'OK' },
    };
    const style = colors[badgeType] || colors.available;
    return (
      <span
        style={{
          background: style.bg,
          color: style.text,
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: '0.7rem',
          fontWeight: 600,
        }}
      >
        {SEVERITY_LABEL[severity] || severity}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>Kiểm tra AI — Xe trả về</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
          Tải ảnh và phân tích (hoặc lưu bằng chứng) tình trạng xe khi trả về
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          borderBottom: '2px solid #e5e7eb',
        }}
      >
        {[
          { key: 'new', icon: <FaCamera />, label: 'Kiểm tra mới' },
          { key: 'history', icon: <FaHistory />, label: 'Lịch sử kiểm tra' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              if (key === 'new') {
                setStep(1);
                setAnalyzed(false);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              borderBottom: tab === key ? '3px solid #10b981' : '3px solid transparent',
              color: tab === key ? '#10b981' : '#6b7280',
              fontWeight: tab === key ? 600 : 400,
              fontSize: '0.95rem',
              transition: 'all 0.2s',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* New inspection tab - 3 step workflow */}
      {tab === 'new' && (
        <div>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 8 }}>
            {[
              { n: 1, label: 'Chọn xe & đơn đặt xe' },
              { n: 2, label: 'Tải ảnh (6 vị trí)' },
              { n: 3, label: 'Kết quả' },
            ].map(({ n, label }) => {
              const done = step > n;
              const active = step >= n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      background: done ? '#10b981' : active ? '#3b82f6' : '#e5e7eb',
                      color: done || active ? '#fff' : '#9ca3af',
                      marginRight: 8,
                    }}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: active ? '#111827' : '#9ca3af',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step 1: Select booking */}
          {step === 1 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: '0 0 24px 0', fontWeight: 700, color: '#111827', fontSize: '1.1rem' }}>
                Chọn chuyến đi đã hoàn thành
              </h3>
              {loadingBookings ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                  <FaSpinner
                    className="animate-spin"
                    style={{ fontSize: '2rem', marginBottom: 12, display: 'inline-block' }}
                  />
                  <p style={{ margin: 0 }}>Đang tải danh sách...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div
                  style={{
                    padding: 60,
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <p style={{ margin: 0, color: '#6b7280' }}>Không có chuyến đi nào đã hoàn thành để kiểm tra</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                    {bookings.map((b) => {
                      const bookingId = b._id || b.id;
                      const vehicleName = b.vehicle_id?.vehicle_name || b.vehicleName || b.vehicle_name || 'Xe';
                      const vehiclePlate = b.vehicle_id?.vehicle_plate || b.vehicle_plate || b.plate || '';
                      const startDate = b.start_date || b.startDate;
                      const endDate = b.end_date || b.endDate;
                      const isSelected = selectedBookingId === String(bookingId);

                      return (
                        <div
                          key={bookingId}
                          onClick={() => setSelectedBookingId(String(bookingId))}
                          style={{
                            padding: 16,
                            border: isSelected ? '2px solid #10b981' : '1px solid #e5e7eb',
                            borderRadius: 10,
                            background: isSelected ? '#f0fdf4' : '#f9fafb',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#10b981';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flexShrink: 0, marginTop: 2 }}>
                              {isSelected ? (
                                <FaCheckCircle style={{ color: '#10b981', fontSize: '1.2rem' }} />
                              ) : (
                                <div
                                  style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #d1d5db' }}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                                  {vehicleName}
                                </span>
                                {vehiclePlate && (
                                  <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
                                    {vehiclePlate}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 12,
                                  fontSize: '0.85rem',
                                  color: '#6b7280',
                                  marginBottom: 8,
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 500 }}>Từ:</span>{' '}
                                  {startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(startDate)) : '—'}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 500 }}>Đến:</span>{' '}
                                  {endDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(endDate)) : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedBookingId}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: selectedBookingId ? '#10b981' : '#d1d5db',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: selectedBookingId ? 'pointer' : 'default',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedBookingId) {
                        e.currentTarget.style.background = '#059669';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedBookingId) {
                        e.currentTarget.style.background = '#10b981';
                      }
                    }}
                  >
                    Tiếp tục kiểm tra →
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Upload images */}
          {step === 2 && selectedBooking && (
            <ReturnImageUploadStep
              selectedBooking={selectedBooking}
              pickupImagesUrls={pickupImagesUrls}
              posFiles={posFiles}
              onSetPosFile={setPosFile}
              validPositions={validPositions}
              readyToAnalyze={readyToAnalyze}
              analyzing={analyzing}
              analysisError={analysisError}
              onBack={() => {
                setStep(1);
                setAnalysisError('');
              }}
              onAnalyze={handleAnalyze}
            />
          )}

          {/* Step 3: Results */}
          {step === 3 && analyzed && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px 0', fontWeight: 600, color: '#111827' }}>Kết quả</h3>

              {saveNote && (
                <div
                  style={{
                    padding: 12,
                    background: '#ecfdf5',
                    border: '1px solid #86efac',
                    color: '#065f46',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FaCheckCircle /> {saveNote}
                </div>
              )}

              {hasSomeShowroomImages && analysisResult && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 12 }}>
                    <strong>Kết quả phân tích AI:</strong>
                  </div>
                  {analysisResult.summary && (
                    <div
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: '0.85rem',
                        color: '#475569',
                        lineHeight: 1.6,
                      }}
                    >
                      {analysisResult.summary}
                    </div>
                  )}
                </div>
              )}

              {!hasSomeShowroomImages && (
                <div
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    fontSize: '0.85rem',
                    color: '#92400e',
                  }}
                >
                  <FaInfoCircle style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>Đã lưu bằng chứng hình ảnh. Không có ảnh trước nên chưa có phân tích AI.</span>
                </div>
              )}

              <button
                onClick={resetFlow}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Kiểm tra xe khác
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {loadingHistory && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <FaSpinner className="animate-spin" style={{ marginRight: 8 }} /> Đang tải lịch sử...
            </div>
          )}

          {!loadingHistory && historyRows.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9fafb',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
              }}
            >
              <FaHistory style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: 12 }} />
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Chưa có kiểm tra trả xe nào</p>
            </div>
          )}

          {!loadingHistory &&
            historyRows.map((row) => (
              <div
                key={row._id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedRow((prev) => (prev === row._id ? null : row._id))}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: expandedRow === row._id ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{row.vehicle_name || 'Xe'}</span>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        ({row.vehicle_plate || row.plate || 'N/A'})
                      </span>
                      {row.damage_detected && getSeverityBadge(row.severity)}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.85rem',
                        color: '#6b7280',
                      }}
                    >
                      <FaClock style={{ fontSize: '0.75rem' }} />
                      {fmtDate(row.createdAt)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingRight: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Vị trí được kiểm tra:</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                        {row.positions_analyzed}/6
                      </div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '1.2rem' }}>
                      {expandedRow === row._id ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {expandedRow === row._id && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: '#f9fafb' }}>
                    {row.positions && row.positions.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12, color: '#374151' }}>
                          Hình ảnh kiểm tra:
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                          {row.positions
                            .filter((p) => p.before_url || p.after_url)
                            .map((p, i) => (
                              <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 6 }}>
                                  {p.position_label}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {p.before_url && (
                                    <a href={p.before_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={p.before_url}
                                        alt="truoc"
                                        style={{
                                          width: '72px',
                                          height: '52px',
                                          objectFit: 'cover',
                                          borderRadius: '4px',
                                          border: '2px solid #bfdbfe',
                                        }}
                                      />
                                    </a>
                                  )}
                                  {p.after_url && (
                                    <a href={p.after_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={p.after_url}
                                        alt="sau"
                                        style={{
                                          width: '72px',
                                          height: '52px',
                                          objectFit: 'cover',
                                          borderRadius: '4px',
                                          border: '2px solid #86efac',
                                        }}
                                      />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {row.ai_payload?.summary && (
                      <div
                        style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                          Tóm tắt AI:
                        </div>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#475569',
                            lineHeight: 1.6,
                          }}
                        >
                          {row.ai_payload.summary}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ReturnInspectionHistory;
