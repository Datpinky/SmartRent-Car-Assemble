import { useEffect, useMemo, useState } from 'react';
import ContractModal from '../../../components/common/ContractModal';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import bookingService from '../../../services/bookingService';
import { getBookingFlowState } from '../../../utils/bookingFlowState';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';
import { getRentalWorkflow, saveRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import RentalBookingOverview from './rentalFlow/components/RentalBookingOverview';
import RentalChecklistSection from './rentalFlow/components/RentalChecklistSection';
import RentalReturnSection from './rentalFlow/components/RentalReturnSection';
import { RECEIVE_FIELDS, RETURN_FIELDS } from './rentalFlow/rentalFlow.constants';
import { countChecked, getCurrentStepIndex, getDueDate, getReturnStateMeta } from './rentalFlow/rentalFlow.utils';

const RentalFlowModal = ({ isOpen, onClose, booking, onSaved }) => {
  const [workflow, setWorkflow] = useState(() => getRentalWorkflow(booking?.id));
  const [savingSection, setSavingSection] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [contractViewerOpen, setContractViewerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      return;
    }

    setWorkflow(getRentalWorkflow(booking.id));
    setSavingSection('');
    setNotice('');
    setError('');
    setContractViewerOpen(false);
  }, [booking?.id, isOpen]);

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
  const returnProgressPercent = Math.round(
    ((returnChecklistCount + returnNoteFilled) / (RETURN_FIELDS.length + 1)) * 100,
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
    setWorkflow((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveSection = async (section) => {
    if (!booking?.id) {
      return;
    }

    const isReceive = section === 'receive';
    const checklistKey = isReceive ? 'receiveChecklist' : 'returnChecklist';
    const noteKey = isReceive ? 'receiveNote' : 'returnNote';

    if (!isReceive && returnLocked) {
      setNotice(
        booking?.status === 'completed'
          ? 'Booking này đã hoàn tất, không thể gửi lại yêu cầu trả xe.'
          : 'Yêu cầu trả xe đã được gửi trước đó. Vui lòng chờ showroom xác nhận.',
      );
      return;
    }

    setSavingSection(section);
    setError('');
    setNotice('');

    try {
      const saved = saveRentalWorkflow(booking.id, {
        [checklistKey]: workflow[checklistKey],
        [noteKey]: workflow[noteKey],
      });
      setWorkflow(saved);

      if (isReceive) {
        let apiStatusUpdated = false;
        if (booking?.status === 'handed_over') {
          try {
            await bookingService.confirmPickupForRenter(booking.id, undefined);
            apiStatusUpdated = true;
          } catch (apiErr) {
            setError(
              `Lưu biên bản thành công nhưng không thể cập nhật trạng thái: ${apiErr.message || 'Lỗi không xác định'}`,
            );
          }
        }

        setNotice(
          apiStatusUpdated
            ? 'Đã xác nhận nhận xe. Trạng thái booking chuyển sang "Đang sử dụng".'
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
          await bookingService.requestReturn(booking.id);
          returnStatusUpdated = true;
        } catch (apiErr) {
          setError(
            `Lưu hồ sơ thành công nhưng không thể cập nhật trạng thái: ${apiErr.message || 'Lỗi không xác định'}`,
          );
        }
      }

      const returnNotice = returnStatusUpdated
        ? 'Đã lưu hồ sơ và gửi yêu cầu trả xe. Showroom sẽ xác nhận và đóng booking.'
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
      setError(err.message || 'Không thể lưu biên bản cho booking này.');
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
              showroom xác nhận - liên hệ showroom để đóng booking.
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
                Booking hiện đang ở trạng thái '{booking.status}', nhưng FE đã mở giao diện trả xe theo mốc thời gian
                của lịch thuê để renter có thể tiếp tục chuẩn bị trả xe đúng hạn.
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
                Booking này chưa đến giai đoạn trả xe. Khi booking chuyển sang bàn giao hoặc đang sử dụng, renter sẽ
                thấy quy trình checklist tương ứng tại đây.
              </div>
            )}
          </div>
        )}
      </Modal>

      {booking && (
        <ContractModal
          isOpen={contractViewerOpen}
          bookingId={booking.id}
          onClose={() => setContractViewerOpen(false)}
        />
      )}
    </>
  );
};

export default RentalFlowModal;
