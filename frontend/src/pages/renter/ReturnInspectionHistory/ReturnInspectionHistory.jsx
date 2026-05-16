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

const normalizeUrlList = (value) =>
  (Array.isArray(value) ? value : Object.values(value || {}).flat())
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean)
    .slice(0, 6);

const ReturnInspectionHistory = () => {
  const [tab, setTab] = useState('new');
  const [step, setStep] = useState(1);

  // New inspection state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [pickupImagesUrls, setPickupImagesUrls] = useState([]); // ảnh từ showroom
  const [returnImagesUrls, setReturnImagesUrls] = useState([]);

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

  // ── Fetch bookings for return phase ──
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const all = await bookingService.getCurrentRoleBookings();
      const eligible = (all || []).filter((b) =>
        ['in_use', 'waiting_return_confirmation', 'completed'].includes(b.status),
      );
      setBookings(eligible);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // ?? Load pickup and return galleries for selected booking ??
  const loadPickupImages = useCallback(async (bookingId) => {
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
        console.warn('Failed to load renter return images from localStorage:', err);
      }

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
      } catch (err) {
        console.warn('Failed to load return inspection gallery:', err);
      }

      setPickupImagesUrls(pickupImages);
      setReturnImagesUrls(returnImages);
    } catch (err) {
      console.error('Failed to load booking galleries:', err);
      setPickupImagesUrls([]);
      setReturnImagesUrls([]);
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

  // ?? Reset flow ??
  const resetFlow = () => {
    setStep(1);
    setAnalyzed(false);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    setReturnImagesUrls([]);
    setAnalysisResult(null);
    setAnalysisError('');
    setSaveNote('');
  };

  // ── Main analyze handler ──
  const handleAnalyze = async (galleryImages) => {
    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
      setAnalysisError('Can it nhat mot anh tra xe de phan tich.');
      return;
    }
    if (!selectedBooking || !selectedBookingId) {
      setAnalysisError('Vui long chon booking.');
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

      const analysisData =
        beforeImages.length > 0
          ? await uploadService.compareBeforeAfterGallery(beforeImages, afterImages)
          : await uploadService.compareGalleryImages(afterImages);
      setAnalysisResult(analysisData);

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

      const bookingCodeShort = (id) => (id ? 'BK' + String(id).slice(-6).toUpperCase() : '');
      const bCode = bookingCodeShort(selectedBookingId);
      const vehicleName =
        selectedBooking?.vehicleName ||
        selectedBooking?.vehicle_name ||
        selectedBooking?.vehicle_id?.vehicle_name ||
        'Xe';

      await inspectionService.create({
        vehicle_id: selectedBooking.vehicle_id?._id || selectedBooking.vehicle_id?.id || selectedBooking.vehicle_id,
        booking_id: selectedBookingId,
        inspection_type: 'return',
        inspected_by_role: 'renter',
        vehicle_name: vehicleName,
        vehicle_plate: selectedBooking.vehicle_plate || selectedBooking.plate || '',
        booking_code: bCode,
        pickup_images: pickupImagesUrls.filter(Boolean).slice(0, 6),
        return_images: returnImageRecord,
        gallery_images: returnImageRecord,
        gallery_analyzed: afterImages.length,
        ai_payload: analysisData || {},
        damage_detected: !!analysisData?.damage_detected,
        severity: analysisData?.severity || 'none',
        observations: Array.isArray(analysisData?.observations) ? analysisData.observations : [],
        summary: analysisData?.summary || '',
        conclusion: analysisData?.conclusion || '',
        disclaimer: analysisData?.disclaimer || '',
        comparison_mode: beforeImages.length > 0 ? 'gallery' : 'current_only',
      });

      setSaveNote('Da luu bao cao kiem tra AI.');
      setAnalyzed(true);
      setStep(3);
    } catch (err) {
      setAnalysisError(err?.message || 'Phan tich that bai. Vui long thu lai.');
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
              { n: 2, label: 'Tải ảnh trả xe' },
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
              initialImages={returnImagesUrls}
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

              {analysisResult && (
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

              {!hasSomeShowroomImages && analysisResult && (
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
                  <span>Không có ảnh bàn giao, AI chỉ đánh giá tình trạng hiện tại và không kết luận hư hỏng mới.</span>
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
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Anh tra xe:</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                        {(row.return_images || row.gallery_images || []).length}/6
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
                    {((row.pickup_images || []).length > 0 || (row.return_images || row.gallery_images || []).length > 0) && (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12, color: '#374151' }}>
                          Hinh anh kiem tra:
                        </div>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
                          {(row.pickup_images || []).length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginBottom: 6, fontWeight: 700 }}>BEFORE</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {(row.pickup_images || []).map((url, i) => (
                                  <a key={url || i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={url}
                                      alt="before"
                                      style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: 4, border: '2px solid #bfdbfe' }}
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {(row.return_images || row.gallery_images || []).length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: 6, fontWeight: 700 }}>AFTER</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {(row.return_images || row.gallery_images || []).map((url, i) => (
                                  <a key={url || i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={url}
                                      alt="after"
                                      style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: 4, border: '2px solid #86efac' }}
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
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
