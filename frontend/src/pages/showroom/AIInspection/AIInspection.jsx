import React, { useCallback, useEffect, useState } from 'react';
import { FaCamera, FaCheckCircle, FaHistory } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import bookingService from '../../../services/bookingService';
import inspectionService from '../../../services/inspectionService';
import uploadService from '../../../services/uploadService';
import vehicleService from '../../../services/vehicleService';
import {
  POSITIONS,
  bookingCodeShort,
  getVehicleName,
  makeInitialPosFiles,
} from './aiInspection.helpers';
import AnalysisResult from './components/AnalysisResult';
import ImageUploadStep from './components/ImageUploadStep';
import InspectionHistory from './components/InspectionHistory';
import VehicleSelector from './components/VehicleSelector';

const AIInspection = () => {
  const { user } = useAuth();
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
    if (!user?._id) { setVehicles([]); setLoadingVehicles(false); return; }
    setLoadingVehicles(true);
    try {
      const { data } = await vehicleService.getList({ added_by: user._id, limit: 80, page: 1 });
      setVehicles(Array.isArray(data) ? data : []);
    } catch { setVehicles([]); }
    finally { setLoadingVehicles(false); }
  }, [user?._id]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const fetchBookingsForVehicle = useCallback(async (vehicleId) => {
    setLoadingBookings(true);
    setBookings([]);
    try {
      const all = await bookingService.getCurrentRoleBookings();
      const filtered = (all || []).filter(
        (b) =>
          String(b.vehicle_id?._id || b.vehicle_id) === String(vehicleId) &&
          ['in_use', 'waiting_return_confirmation', 'completed'].includes(b.status),
      );
      setBookings(filtered);
    } catch { setBookings([]); }
    finally { setLoadingBookings(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { items } = await inspectionService.list({ limit: 50, page: 1 });
      setHistoryRows(items || []);
    } catch { setHistoryRows([]); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  // ── Callbacks ──
  const setPosFile = (key, type, file) =>
    setPosFiles((prev) => ({ ...prev, [key]: { ...prev[key], [type]: file } }));

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedBookingId('');
    setPickupImagesUrls([]);
    fetchBookingsForVehicle(String(v._id || v.id));
  };

  const handleSelectBooking = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setPickupImagesUrls([]);
    if (!bookingId) return;
    try {
      const booking = await bookingService.getBookingById(bookingId);
      const imgs = booking?.pickup_images || [];
      setPickupImagesUrls(Array.isArray(imgs) ? imgs : []);
    } catch { setPickupImagesUrls([]); }
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
    if (!readyToAnalyze) { setAnalysisError('Can it nhat mot vi tri co du ca anh TRUOC va anh SAU.'); return; }
    if (!selectedVehicle) { setAnalysisError('Vui long chon xe o buoc 1.'); return; }
    setAnalyzing(true);
    setAnalysisError('');
    setSaveNote('');
    try {
      const positionsInput = await Promise.all(
        validPositions.map(async (p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          let beforeFile = posFiles[p.key].before;
          const pickupUrl = pickupImagesUrls[posIdx];
          if (!beforeFile && pickupUrl) {
            try {
              const resp = await fetch(pickupUrl);
              const blob = await resp.blob();
              beforeFile = new File([blob], `pickup_${p.key}.jpg`, { type: blob.type || 'image/jpeg' });
            } catch { /* keep null */ }
          }
          return { key: p.key, label: p.label, beforeFile, afterFile: posFiles[p.key].after };
        }),
      );

      const data = await uploadService.compareMultiPosition(positionsInput);
      setAnalysisResult(data);

      // Upload files and record positions
      const positionsRecord = [];
      try {
        const filesToUpload = [];
        const uploadMap = [];
        positionsInput.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const hasPU = !!pickupImagesUrls[posIdx];
          if (!hasPU && p.beforeFile) { filesToUpload.push(p.beforeFile); uploadMap.push({ posKey: p.key, type: 'before' }); }
          if (p.afterFile) { filesToUpload.push(p.afterFile); uploadMap.push({ posKey: p.key, type: 'after' }); }
        });
        const uploadedUrls = filesToUpload.length > 0 ? await uploadService.uploadImages(filesToUpload) : [];
        const urlByPosType = {};
        uploadMap.forEach((entry, i) => { urlByPosType[`${entry.posKey}_${entry.type}`] = uploadedUrls[i]?.url || ''; });
        positionsInput.forEach((p) => {
          const posIdx = POSITIONS.findIndex((pp) => pp.key === p.key);
          const pickupUrl = pickupImagesUrls[posIdx] || '';
          positionsRecord.push({
            position_key: p.key,
            position_label: p.label,
            before_url: pickupUrl || urlByPosType[`${p.key}_before`] || '',
            after_url: urlByPosType[`${p.key}_after`] || '',
          });
        });
      } catch {
        setSaveNote('Khong tai duoc anh len luu tru.');
        positionsInput.forEach((p) => {
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
          vehicle_name: vehicleName,
          vehicle_plate: selectedVehicle.vehicle_plate_number || '',
          booking_code: bCode,
          positions: positionsRecord,
          positions_analyzed: positionsInput.length,
          ai_payload: data || {},
          damage_detected: !!data?.damage_detected,
          severity: data?.severity || 'none',
          position_results: Array.isArray(data?.positions) ? data.positions : [],
        });
        setSaveNote((s) => `${s ? s + ' ' : ''}Da luu bao cao kiem tra.`.trim());
        fetchHistory();
      } catch (saveErr) {
        setSaveNote((s) =>
          `${s ? s + ' ' : ''}Phan tich xong nhung khong luu duoc: ${saveErr.message || 'Loi server'}`.trim(),
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
          <h1 className="page-title">Kiem tra AI — So sanh xe</h1>
          <p className="page-subtitle">So sanh anh xe truoc va sau khi thue de phat hien hu hong moi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'new', icon: <FaCamera aria-hidden />, label: 'Kiem tra moi' },
          { key: 'history', icon: <FaHistory aria-hidden />, label: 'Lich su kiem tra' },
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
              { n: 1, label: 'Chon xe & booking' },
              { n: 2, label: 'Tai anh (6 vi tri)' },
              { n: 3, label: 'Ket qua AI' },
            ].map(({ n, label }, i) => {
              const done = step > n;
              const active = step >= n;
              return (
                <React.Fragment key={n}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
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
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2.5 ${step > n + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
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
              pickupImagesUrls={pickupImagesUrls}
              posFiles={posFiles}
              onSetPosFile={setPosFile}
              validPositions={validPositions}
              readyToAnalyze={readyToAnalyze}
              analyzing={analyzing}
              analysisError={analysisError}
              onBack={() => { setStep(1); setAnalysisError(''); }}
              onAnalyze={handleAnalyze}
            />
          )}

          {step === 3 && analyzed && analysisResult && (
            <AnalysisResult
              analysisResult={analysisResult}
              saveNote={saveNote}
              onReset={resetFlow}
            />
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