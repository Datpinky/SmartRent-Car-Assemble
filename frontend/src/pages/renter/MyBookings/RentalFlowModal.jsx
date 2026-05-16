import { useEffect, useMemo, useState } from 'react';
import ContractModal from '../../../components/common/ContractModal';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import bookingService from '../../../services/bookingService';
import inspectionService from '../../../services/inspectionService';
import { getBookingFlowState } from '../../../utils/bookingFlowState';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';
import { getRentalWorkflow, saveRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import RentalBookingOverview from './rentalFlow/components/RentalBookingOverview';
import RentalChecklistSection from './rentalFlow/components/RentalChecklistSection';
import RentalReturnSection from './rentalFlow/components/RentalReturnSection';
import { RECEIVE_FIELDS, RETURN_FIELDS } from './rentalFlow/rentalFlow.constants';
import { countChecked, getCurrentStepIndex, getDueDate, getReturnStateMeta } from './rentalFlow/rentalFlow.utils';

const RentalFlowModal = ({ isOpen, onClose, booking, onSaved }) => {
  const bookingId = booking?._id || booking?.id;
  const [workflow, setWorkflow] = useState(() => getRentalWorkflow(bookingId));
  const [savingSection, setSavingSection] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [contractViewerOpen, setContractViewerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !bookingId) {
      return;
    }

    setWorkflow(getRentalWorkflow(bookingId));
    setSavingSection('');
    setNotice('');
    setError('');
    setContractViewerOpen(false);
  }, [bookingId, isOpen]);

  const flowState = useMemo(() => getBookingFlowState(booking), [booking]);
  const currentStepIndex = useMemo(
    () => getCurrentStepIndex(flowState.effectiveFlowStatus),
    [flowState.effectiveFlowStatus],
  );

  const usingTimelineFallback = flowState.timeBasedRentalAccess && booking?.status !== flowState.effectiveFlowStatus;

  const returnDueDate = useMemo(() => getDueDate(booking), [booking]);
  const returnWindowOpened = !returnDueDate || Date.now() >= returnDueDate.getTime();
  const returnLocked = ['waiting_return_confirmation', 'completed'].includes(booking?.status);
  const returnChecklistCount = countChecked(workflow.returnChecklist);
  const receiveChecklistCount = countChecked(workflow.receiveChecklist);
  const returnNoteFilled = workflow.returnNote?.trim() ? 1 : 0;

  const returnImages = Array.isArray(workflow.returnImages)
    ? workflow.returnImages.filter(Boolean).slice(0, 6)
    : Object.values(workflow.returnImages || {}).flat().filter(Boolean).slice(0, 6);
  const hasReturnImages = returnImages.length > 0;

  const returnProgressPercent = Math.round(
    ((returnChecklistCount + returnNoteFilled + (hasReturnImages ? 1 : 0)) / (RETURN_FIELDS.length + 2)) * 100,
  );
  const showReceiveSection = ['waiting_handover', 'handed_over'].includes(booking?.status);
  const showReturnSection = ['in_use', 'waiting_return_confirmation', 'completed'].includes(booking?.status);

  const returnStateMeta = useMemo(
    () => getReturnStateMeta(booking?.status, returnDueDate, returnWindowOpened),
    [booking?.status, returnDueDate, returnWindowOpened],
  );

  const toggleChecklist = (section, key) => {
    setWorkflow((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: !current[section][key],
      },
    }));
  };

  const updateWorkflowField = (key, value) => {
    const updated = {
      returnImages: workflow.returnImages,
      returnNote: workflow.returnNote,
      receiveImages: workflow.receiveImages,
      receiveNote: workflow.receiveNote,
      returnChecklist: workflow.returnChecklist,
      receiveChecklist: workflow.receiveChecklist,
      [key]: value,
    };
    setWorkflow(updated);
    // Auto-save to localStorage (especially important for returnImages)
    saveRentalWorkflow(bookingId, updated);
    console.log(`💾 Auto-saved workflow field '${key}' to localStorage with bookingId: ${bookingId}`);
  };

  const handleSaveSection = async (section) => {
    if (!bookingId) {
      return;
    }

    const isReceive = section === 'receive';
    const checklistKey = isReceive ? 'receiveChecklist' : 'returnChecklist';
    const noteKey = isReceive ? 'receiveNote' : 'returnNote';

    if (!isReceive && returnLocked) {
      setNotice(
        booking?.status === 'completed'
          ? 'Đơn đặt xe này đã hoàn tất, không thể gửi lại yêu cầu trả xe.'
          : 'Yêu cầu trả xe đã được gửi trước đó. Vui lòng chờ showroom xác nhận.',
      );
      return;
    }

    setSavingSection(section);
    setError('');
    setNotice('');

    try {
      const saved = saveRentalWorkflow(bookingId, {
        [checklistKey]: workflow[checklistKey],
        [noteKey]: workflow[noteKey],
        ...(!isReceive && { returnImages: workflow.returnImages }),
      });
      setWorkflow(saved);

      if (isReceive) {
        let apiStatusUpdated = false;
        if (booking?.status === 'handed_over') {
          try {
            await bookingService.confirmPickupForRenter(bookingId, undefined);
            apiStatusUpdated = true;
          } catch (apiErr) {
            setError(
              `Lưu biên bản thành công nhưng không thể cập nhật trạng thái: ${apiErr.message || 'Lỗi không xác định'}`,
            );
          }
        }

        setNotice(
          apiStatusUpdated
            ? 'Đã xác nhận nhận xe. Trạng thái đơn chuyển sang "Đang sử dụng".'
            : 'Đã lưu biên bản nhận xe.',
        );

        if (onSaved) {
          await onSaved({ workflow: saved, statusUpdated: apiStatusUpdated });
        }
        return;
      }

      let returnStatusUpdated = false;
      if (booking?.status === 'in_use') {
        try {
          const rawReturnImages = Array.isArray(workflow.returnImages)
            ? workflow.returnImages
            : Object.values(workflow.returnImages || {}).flat();
          const returnImageUrls = rawReturnImages
            .map((img) => (typeof img === 'string' ? img : img?.url || ''))
            .filter((url) => url && url.startsWith('http'))
            .slice(0, 6);

          if (returnImageUrls.length > 0) {
            // Fetch full booking to ensure vehicle_id is populated
            let fullBooking = booking;
            try {
              const freshBooking = await bookingService.getBookingById(booking._id || booking.id);
              if (freshBooking) {
                fullBooking = freshBooking;
                console.log('Fetched full booking for inspection:', {
                  bookingId: fullBooking._id || fullBooking.id,
                  vehicle_id: fullBooking.vehicle_id,
                });
              }
            } catch (fetchErr) {
              console.warn('Failed to fetch fresh booking, using existing:', fetchErr);
            }

            const vehicleId =
              (typeof fullBooking.vehicle_id === 'string' ? fullBooking.vehicle_id : null) ||
              fullBooking.vehicle_id?._id ||
              fullBooking.vehicle_id?.id;

            if (!vehicleId) {
              console.error('Cannot create inspection: vehicle_id is missing or invalid', {
                bookingId: fullBooking._id || fullBooking.id,
                vehicle_id: fullBooking.vehicle_id,
              });
            } else {
              const inspectionPayload = {
                vehicle_id: vehicleId,
                booking_id: fullBooking._id || fullBooking.id,
                inspection_type: 'return',
                inspected_by_role: 'renter',
                vehicle_name: fullBooking.vehicleName || fullBooking.vehicle_id?.vehicle_name || 'Xe',
                vehicle_plate: fullBooking.vehicle_plate || fullBooking.plate || '',
                booking_code: 'BK' + String(fullBooking._id || fullBooking.id).slice(-6).toUpperCase(),
                pickup_images: Array.isArray(fullBooking.pickup_images) ? fullBooking.pickup_images.slice(0, 6) : [],
                return_images: returnImageUrls,
                gallery_images: returnImageUrls,
                gallery_analyzed: returnImageUrls.length,
                ai_payload: {},
                damage_detected: false,
                severity: 'none',
                observations: [],
                comparison_mode: 'gallery',
              };
              console.log('Creating renter return inspection record:', {
                bookingId: booking._id || booking.id,
                vehicleId,
                returnImagesCount: returnImageUrls.length,
                payload: inspectionPayload,
              });
              try {
                const createdInspection = await inspectionService.create(inspectionPayload);
                console.log('Inspection record created:', {
                  inspectionId: createdInspection?._id || createdInspection?.id,
                  response: createdInspection,
                });
              } catch (inspectionErr) {
                console.error('Failed to create inspection record:', inspectionErr);
              }
            }
          } else {
            console.log('No return images to create inspection record');
          }

          // Request return status update
          await bookingService.requestReturn(bookingId);
          returnStatusUpdated = true;
        } catch (apiErr) {
          setError(
            `Lưu hồ sơ thành công nhưng không thể cập nhật trạng thái: ${apiErr.message || 'Lỗi không xác định'}`,
          );
        }
      }

      const returnNotice = returnStatusUpdated
        ? 'Đã lưu hồ sơ và gửi yêu cầu trả xe. Showroom sẽ xác nhận và đóng đơn đặt xe.'
        : 'Đã lưu checklist trả xe.';

      setNotice(returnNotice);

      if (onSaved) {
        await onSaved({
          workflow: saved,
          status: returnStatusUpdated ? 'waiting_return_confirmation' : booking?.status,
          notice: { tone: returnStatusUpdated ? 'success' : 'warning', text: returnNotice },
        });
      }
    } catch (err) {
      console.error('[RentalFlowModal] handleSaveSection error:', err);
      setError(err.message || 'Không thể lưu biên bản cho đơn đặt xe này.');
    } finally {
      setSavingSection('');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Quy trình trả xe - ${booking?.vehicleName || ''}`} width={1040}>
        {booking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 14,
                padding: 14,
                color: '#1d4ed8',
                fontSize: '0.82rem',
                lineHeight: 1.6,
              }}
            >
              <strong>Checklist nhận xe / trả xe lưu cục bộ trên trình duyệt.</strong> Trạng thái trên hệ thống do
              showroom xác nhận - liên hệ showroom để đóng đơn đặt xe.
            </div>

            {usingTimelineFallback && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 14,
                  padding: 14,
                  color: '#065f46',
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                }}
              >
                Đơn đặt xe hiện đang ở trạng thái '{booking.status}', bạn vẫn có thể chuẩn bị trả xe đúng hạn.
              </div>
            )}

            <RentalBookingOverview booking={booking} currentStepIndex={currentStepIndex} />

            {canRenterViewOfficialRentalContract(booking) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="renter-btn-soft"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setContractViewerOpen(true)}
                >
                  {RENTAL_CONTRACT_UI.officialButton}
                </button>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                }}
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                }}
              >
                {notice}
              </div>
            )}

            {showReceiveSection && (
              <RentalChecklistSection
                title={`Biên bản nhận xe (${receiveChecklistCount}/${RECEIVE_FIELDS.length})`}
                fields={RECEIVE_FIELDS}
                sectionKey="receiveChecklist"
                noteKey="receiveNote"
                saveKey="receive"
                workflow={workflow}
                savingSection={savingSection}
                onToggleChecklist={toggleChecklist}
                onChangeNote={updateWorkflowField}
                onSaveSection={handleSaveSection}
              />
            )}

            {showReturnSection && (
              <RentalReturnSection
                returnStateMeta={returnStateMeta}
                returnDueDate={returnDueDate}
                workflow={workflow}
                returnLocked={returnLocked}
                returnChecklistCount={returnChecklistCount}
                returnProgressPercent={returnProgressPercent}
                savingSection={savingSection}
                onToggleChecklist={toggleChecklist}
                onChangeReturnNote={(value) => updateWorkflowField('returnNote', value)}
                onChangeReturnImages={(images) => updateWorkflowField('returnImages', images)}
                onSaveReturn={() => handleSaveSection('return')}
              />
            )}

            {!showReceiveSection && !showReturnSection && (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 18,
                  color: '#6b7280',
                  fontSize: '0.84rem',
                }}
              >
                Đơn đặt xe này chưa đến giai đoạn trả xe. Khi đơn chuyển sang bàn giao hoặc đang sử dụng, bạn sẽ thấy
                quy trình checklist tương ứng tại đây.
              </div>
            )}
          </div>
        )}
      </Modal>

      {booking && (
        <ContractModal isOpen={contractViewerOpen} bookingId={bookingId} onClose={() => setContractViewerOpen(false)} />
      )}
    </>
  );
};

export default RentalFlowModal;
