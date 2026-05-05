import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaCamera,
  FaCheckCircle,
  FaClipboardCheck,
  FaImages,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaRegClock,
  FaRobot,
  FaShieldAlt,
  FaStore,
  FaUpload,
} from 'react-icons/fa';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import RentalContractViewerModal from '../components/RentalContractViewerModal';
import { canRenterViewOfficialRentalContract } from '../../../utils/rentalContractEligibility';
import FileUpload from '../../../components/common/FileUpload';
import StatusBadge from '../../../components/common/StatusBadge';
import uploadService from '../../../services/uploadService';
import bookingAiService from '../../../services/bookingAiService';
import { getAiInspectionSummaryMeta, mapServerAiInspectionToViewModel } from '../../../utils/aiInspectionReport';
import { getBookingFlowState } from '../../../utils/bookingFlowState';
import { getRentalWorkflow, saveRentalWorkflow } from '../../../utils/rentalWorkflowStorage';
import { AI_FLOW_MESSAGES, getAiFlowHeadline } from '../../../utils/renterAiReportStatus';

const FLOW_STEPS = [
  { status: 'waiting_handover', label: 'Chờ bàn giao' },
  { status: 'handed_over', label: 'Đã bàn giao' },
  { status: 'in_use', label: 'Đang sử dụng' },
  { status: 'waiting_return_confirmation', label: 'Chờ xác nhận trả' },
  { status: 'completed', label: 'Hoàn thành' },
];

const RECEIVE_FIELDS = [
  { key: 'exterior', label: 'Ngoại thất không có va chạm bất thường' },
  { key: 'interior', label: 'Nội thất sạch sẽ, đủ phụ kiện' },
  { key: 'documents', label: 'Đã nhận giấy tờ và hướng dẫn xe' },
  { key: 'fuelLevel', label: 'Mức nhiên liệu / pin đúng như bàn giao' },
];

const RETURN_FIELDS = [
  { key: 'belongings', label: 'Đã lấy hết đồ cá nhân ra khỏi xe' },
  { key: 'cleanliness', label: 'Tình trạng vệ sinh đã được kiểm tra' },
  { key: 'damagesChecked', label: 'Đã đối chiếu vết trầy xước / hư hỏng' },
  { key: 'fuelLevel', label: 'Đã ghi nhận lại mức nhiên liệu / pin' },
];

const RETURN_FLOW_STEPS = [
  {
    title: 'Kiểm tra nhanh',
    description: 'Chốt tình trạng xe, mức nhiên liệu và đồ đạc trước khi chụp ảnh.',
  },
  {
    title: 'Tải ảnh trả xe',
    description: 'Thêm các góc chụp rõ nét để showroom đối chiếu nhanh hơn.',
  },
  {
    title: 'Gửi ảnh & phân tích AI (server)',
    description: 'Ảnh trả xe upload lên server; báo cáo AI được lưu theo booking để showroom và bạn xem lại.',
  },
];

const RETURN_PHOTO_TIPS = [
  'Chụp toàn cảnh đầu xe, hông xe và đuôi xe / cốp sau nếu có.',
  'Nếu có trầy xước hoặc móp, chụp cận cảnh và thêm một ảnh toàn cảnh.',
  'Ưu tiên ánh sáng tốt, rõ nét, không bị che bởi người hoặc vật dụng.',
  'Nếu nội thất có vấn đề, chụp thêm ghế, tap-lô và khoang hành lý.',
];

const getCurrentStepIndex = (status) => {
  const index = FLOW_STEPS.findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
};

const dedupeUrls = (urls) => Array.from(new Set((urls || []).filter(Boolean)));

const countChecked = (values = {}) => Object.values(values).filter(Boolean).length;

const NOTICE_STYLES = {
  info: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
  },
  success: {
    background: '#f0fdf4',
    border: '1px solid #86efac',
    color: '#166534',
  },
  warning: {
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
  },
};

const baseCardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
};

const getDueDate = (booking) => {
  const rawValue = booking?.raw?.end_date || booking?.endDate || booking?.end_date;
  if (!rawValue) return null;

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const RentalFlowModal = ({ isOpen, onClose, booking, onSaved }) => {
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(() => getRentalWorkflow(booking?.id));
  const [receiveFiles, setReceiveFiles] = useState([]);
  const [returnFiles, setReturnFiles] = useState([]);
  const [savingSection, setSavingSection] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [serverAi, setServerAi] = useState(null);
  const [serverAiLoading, setServerAiLoading] = useState(false);
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      return;
    }

    setWorkflow(getRentalWorkflow(booking.id));
    setReceiveFiles([]);
    setReturnFiles([]);
    setSavingSection('');
    setNotice('');
    setError('');
    setContractViewerOpen(false);
    setServerAi(null);
  }, [booking?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      return;
    }
    let cancelled = false;
    (async () => {
      setServerAiLoading(true);
      try {
        const data = await bookingAiService.getReportByBookingId(booking.id);
        if (!cancelled) {
          setServerAi(data);
        }
      } catch {
        if (!cancelled) {
          setServerAi(null);
        }
      } finally {
        if (!cancelled) {
          setServerAiLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booking?.id, isOpen, booking?.raw?.ai_inspection?.status, booking?.raw?.ai_inspection?.analyzed_at]);

  const flowState = useMemo(() => getBookingFlowState(booking), [booking]);
  const currentStepIndex = useMemo(
    () => getCurrentStepIndex(flowState.effectiveFlowStatus),
    [flowState.effectiveFlowStatus]
  );

  const canHandleReceive = flowState.canHandleReceive;
  const canHandleReturn = flowState.canHandleReturn;
  const usingTimelineFallback = flowState.timeBasedRentalAccess && booking?.status !== flowState.effectiveFlowStatus;

  const returnDueDate = useMemo(() => getDueDate(booking), [booking]);
  const returnWindowOpened = !returnDueDate || Date.now() >= returnDueDate.getTime();
  const returnLocked = ['waiting_return_confirmation', 'completed'].includes(booking?.status);
  const returnChecklistCount = countChecked(workflow.returnChecklist);
  const receiveChecklistCount = countChecked(workflow.receiveChecklist);
  const savedReturnImages = workflow.returnImages?.length || 0;
  const draftReturnImages = returnFiles.length;
  const totalReturnImagesReady = savedReturnImages + draftReturnImages;
  const receiveReferenceImage = workflow.receiveImages?.[0] || '';
  const viewAiReport = useMemo(() => mapServerAiInspectionToViewModel(serverAi), [serverAi]);
  const hasAiInspectionReport = Boolean(viewAiReport);
  const aiInspectionMeta = useMemo(
    () => getAiInspectionSummaryMeta(viewAiReport),
    [viewAiReport]
  );
  const aiPhaseHeadline = useMemo(() => {
    if (serverAiLoading) return 'Đang tải trạng thái báo cáo AI...';
    if (aiGenerateLoading || serverAi?.status === 'pending') return AI_FLOW_MESSAGES.analyzing;
    if (serverAi?.status === 'failed') return AI_FLOW_MESSAGES.failed;
    if (hasAiInspectionReport) return getAiFlowHeadline(serverAi);
    if (!receiveReferenceImage) return 'Bạn cần lưu ảnh nhận xe đối chiếu (upload) trước khi chạy AI.';
    return AI_FLOW_MESSAGES.needUpload;
  }, [aiGenerateLoading, hasAiInspectionReport, receiveReferenceImage, serverAi, serverAiLoading]);
  const returnNoteFilled = workflow.returnNote?.trim() ? 1 : 0;
  const returnProgressPercent = Math.round(
    ((returnChecklistCount + Math.min(totalReturnImagesReady, 1) + returnNoteFilled) / (RETURN_FIELDS.length + 2)) * 100
  );
  const returnStateMeta = useMemo(() => {
    if (booking?.status === 'completed') {
      return {
        tone: 'success',
        eyebrow: 'Đã hoàn tất',
        title: 'Showroom đã xác nhận việc trả xe',
        description: 'Ảnh và biên bản trả xe đã được chốt. Bạn chỉ cần lưu lại thông tin đối chiếu khi cần.',
      };
    }

    if (booking?.status === 'waiting_return_confirmation') {
      return {
        tone: 'info',
        eyebrow: 'Đang chờ đối chiếu',
        title: 'Showroom đã nhận yêu cầu trả xe (trên hệ thống)',
        description: 'Showroom đang kiểm tra ảnh và tình trạng xe. Bạn tạm thời không cần gửi thêm lần nữa.',
      };
    }

    if (!returnWindowOpened && returnDueDate) {
      return {
        tone: 'warning',
        eyebrow: 'Chưa đến hạn',
        title: 'Chưa đến mốc trả xe trên lịch thuê',
        description: `Bạn có thể chụp và chuẩn bị trước. Nên lưu đủ hồ sơ trả xe (cục bộ) sau ${formatDateTime(returnDueDate)} và liên hệ showroom để đóng booking trên hệ thống.`,
      };
    }

    return {
      tone: 'warning',
      eyebrow: 'Lưu hồ sơ cục bộ',
      title: 'Bạn đang hoàn tất hồ sơ trả xe trên trình duyệt',
      description: 'Hoàn tất checklist, tải ảnh rõ nét và lưu cục bộ. Đây không phải bước xác nhận trả xe trên server — vui lòng liên hệ showroom để đối chiếu và cập nhật trạng thái.',
    };
  }, [booking?.status, returnDueDate, returnWindowOpened]);

  const toggleChecklist = (section, key) => {
    setWorkflow((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: !current[section][key],
      },
    }));
  };

  const handleSaveSection = async (section) => {
    if (!booking?.id) {
      return;
    }

    const isReceive = section === 'receive';
    const selectedFiles = isReceive ? receiveFiles : returnFiles;
    const imageKey = isReceive ? 'receiveImages' : 'returnImages';
    const checklistKey = isReceive ? 'receiveChecklist' : 'returnChecklist';
    const noteKey = isReceive ? 'receiveNote' : 'returnNote';

    if (!isReceive) {
      if (!returnWindowOpened && returnDueDate) {
        setError(`Chưa đến hạn trả xe. Bạn có thể gửi yêu cầu trả xe (trên hệ thống) từ ${formatDateTime(returnDueDate)}.`);
        setNotice('');
        return;
      }

      if (returnLocked) {
        setError('');
        setNotice(
          booking?.status === 'completed'
            ? 'Booking này đã hoàn tất, không thể gửi lại yêu cầu trả xe.'
            : 'Yêu cầu trả xe đã được gửi trước đó. Vui lòng chờ showroom xác nhận.'
        );
        return;
      }

      const existingReturnImages = workflow[imageKey] || [];
      if (!selectedFiles.length && !existingReturnImages.length) {
        setError('Vui lòng tải lên ít nhất 1 ảnh trả xe trước khi lưu hồ sơ cục bộ (và liên hệ showroom).');
        setNotice('');
        return;
      }
    }

    setSavingSection(section);
    setError('');
    setNotice('');

    try {
      let uploadedUrls = [];
      if (selectedFiles.length > 0) {
        const results = await uploadService.uploadImages(selectedFiles);
        uploadedUrls = results.map((item) => item.url).filter(Boolean);
      }

      let saved = saveRentalWorkflow(booking.id, {
        [checklistKey]: workflow[checklistKey],
        [noteKey]: workflow[noteKey],
        [imageKey]: dedupeUrls([...(workflow[imageKey] || []), ...uploadedUrls]),
      });

      setWorkflow(saved);
      if (isReceive) {
        setReceiveFiles([]);
        setNotice('Đã lưu biên bản nhận xe cục bộ trên trình duyệt và các liên kết ảnh đã upload.');

        if (onSaved) {
          await onSaved({ workflow: saved });
        }
        return;
      }

      const nextStatus = booking?.status;
      const noticeParts = [];

      const beforeImageUrl = saved.receiveImages?.[0] || workflow.receiveImages?.[0] || '';
      const mergedReturnUrls = dedupeUrls(saved.returnImages || []);

      let nextServerAiPayload = serverAi;

      if (beforeImageUrl && mergedReturnUrls.length > 0) {
        setAiGenerateLoading(true);
        let gen;
        try {
          gen = await bookingAiService.generateReport(booking.id, {
            pickup_image_url: beforeImageUrl,
            return_image_urls: mergedReturnUrls,
          });
        } finally {
          setAiGenerateLoading(false);
        }
        nextServerAiPayload = gen.data;
        if (gen.data) {
          setServerAi(gen.data);
        }
        if (gen.ok) {
          noticeParts.push(
            gen.data?.result?.damage_detected
              ? 'Báo cáo AI đã lưu trên server — có điểm cần showroom đối chiếu.'
              : 'Báo cáo AI đã lưu trên server — không ghi nhận hư hỏng mới rõ rệt.'
          );
        } else {
          noticeParts.push(
            gen.message || 'Phân tích AI không thành công. Bạn có thể chỉnh ảnh và lưu lại để thử lại.'
          );
        }
      } else if (!beforeImageUrl) {
        noticeParts.push('Chưa có ảnh nhận xe đối chiếu — cần lưu bước nhận xe (upload ảnh) trước khi chạy AI.');
      }

      noticeParts.unshift('Đã lưu checklist/ảnh nháp cục bộ trên trình duyệt; ảnh trả xe đã upload lên storage.');
      noticeParts.push('Trạng thái trả xe trên hệ thống vẫn do showroom xác nhận; báo cáo AI là tài liệu đối chiếu trên server.');

      const localReturnNotice = noticeParts.join(' ');
      setNotice(localReturnNotice);

      setReturnFiles([]);

      if (onSaved) {
        await onSaved({
          workflow: saved,
          status: nextStatus,
          ai_inspection: nextServerAiPayload,
          notice: {
            tone: 'warning',
            text: localReturnNotice,
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu biên bản cho booking này.');
    } finally {
      setSavingSection('');
    }
  };

  const renderSavedImages = (images = []) => {
    if (!images.length) {
      return (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 16,
            padding: '18px 16px',
            background: '#f9fafb',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          Chưa có ảnh nào được lưu cho bước này.
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {images.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #dbe3ea',
              background: '#f8fafc',
              minHeight: 108,
            }}
          >
            <img src={url} alt="Rental evidence" style={{ width: '100%', height: 108, objectFit: 'cover' }} />
          </a>
        ))}
      </div>
    );
  };

  const renderReturnExperience = () => {
    const summaryStats = [
      { label: 'Checklist', value: `${returnChecklistCount}/${RETURN_FIELDS.length}` },
      { label: 'Ảnh đã lưu', value: String(savedReturnImages) },
      { label: 'Ảnh đang chọn', value: String(draftReturnImages) },
    ];

    const actionDisabled = returnLocked || (!returnWindowOpened && Boolean(returnDueDate));
    const noticeTheme = NOTICE_STYLES[returnStateMeta.tone] || NOTICE_STYLES.info;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            borderRadius: 24,
            padding: 22,
            color: '#fff',
            background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 38%, #16a34a 100%)',
            boxShadow: '0 22px 48px rgba(15, 118, 110, 0.22)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 560 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.14)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  marginBottom: 12,
                }}
              >
                <FaCamera />
                {returnStateMeta.eyebrow}
              </div>

              <div style={{ fontSize: '1.32rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
                {returnStateMeta.title}
              </div>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.86)' }}>
                {returnStateMeta.description}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12, minWidth: 260, flex: '1 1 280px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: 'rgba(255,255,255,0.78)', marginBottom: 6 }}>
                  <FaRegClock />
                  Hạn gửi yêu cầu trả xe
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                  {returnDueDate ? formatDateTime(returnDueDate) : 'Ngày kết thúc chuyến'}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: 'rgba(255,255,255,0.78)', marginBottom: 6 }}>
                  <FaImages />
                  Bộ hồ sơ trả xe
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                  {totalReturnImagesReady} ảnh sẵn sàng, {returnChecklistCount}/{RETURN_FIELDS.length} mục đã check
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {RETURN_FLOW_STEPS.map((step, index) => (
            <div
              key={step.title}
              style={{
                ...baseCardStyle,
                padding: 16,
                background: index === 1 ? '#f0fdf4' : '#fff',
                borderColor: index === 1 ? '#bbf7d0' : '#e5e7eb',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: index === 1 ? '#dcfce7' : '#f3f4f6',
                  color: index === 1 ? '#059669' : '#6b7280',
                  marginBottom: 10,
                  fontWeight: 800,
                }}
              >
                {index + 1}
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>{step.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>{step.description}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={baseCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#ecfdf5',
                    color: '#059669',
                  }}
                >
                  <FaShieldAlt />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Checklist trước khi lưu hồ sơ trả xe (cục bộ)</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Hoàn tất từng mục để showroom đối chiếu nhanh hơn.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                {RETURN_FIELDS.map((field) => {
                  const checked = Boolean(workflow.returnChecklist[field.key]);

                  return (
                    <label
                      key={field.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '13px 14px',
                        borderRadius: 18,
                        border: `1px solid ${checked ? '#86efac' : '#e5e7eb'}`,
                        background: checked ? '#f0fdf4' : '#fff',
                        cursor: returnLocked ? 'default' : 'pointer',
                        opacity: returnLocked ? 0.84 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={returnLocked}
                        onChange={() => !returnLocked && toggleChecklist('returnChecklist', field.key)}
                        style={{ accentColor: '#00b14f', width: 16, height: 16, marginTop: 3 }}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', color: '#111827', fontWeight: 700 }}>{field.label}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: 3 }}>
                          {checked ? 'Đã đánh dấu xong.' : 'Đánh dấu sau khi bạn đã tự kiểm tra xong.'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={baseCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#eff6ff',
                    color: '#2563eb',
                  }}
                >
                  <FaInfoCircle />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Ghi chú trả xe</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Thêm ghi chú nếu có vết trầy, phụ kiện thiếu hoặc thông tin cần showroom lưu ý.
                  </div>
                </div>
              </div>

              <textarea
                rows={5}
                value={workflow.returnNote}
                onChange={(event) =>
                  !returnLocked &&
                  setWorkflow((current) => ({
                    ...current,
                    returnNote: event.target.value,
                  }))
                }
                disabled={returnLocked}
                placeholder="Ví dụ: đã nạp đầy xăng, có vết xước nhỏ ở cánh cửa sau, đã để lại chìa khóa và giấy tờ..."
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 18,
                  padding: '14px 16px',
                  fontSize: '0.84rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  background: returnLocked ? '#f9fafb' : '#fff',
                  minHeight: 132,
                }}
              />

              <div style={{ marginTop: 10, fontSize: '0.74rem', color: '#6b7280' }}>
                {workflow.returnNote?.trim()
                  ? `${workflow.returnNote.trim().length} ký tự đã nhập.`
                  : 'Thêm một ghi chú ngắn gọn sẽ giúp showroom đối chiếu nhanh hơn.'}
              </div>
            </div>

            <div
              style={{
                ...baseCardStyle,
                background: '#fcfffe',
                borderColor: '#d1fae5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#dcfce7',
                    color: '#16a34a',
                  }}
                >
                  <FaUpload />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Upload ảnh trả xe</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Tối đa 5 ảnh. Bộ ảnh này dùng chung cho biên bản trả xe và báo cáo AI đối chiếu (lưu trên trình duyệt hiện tại).
                  </div>
                </div>
              </div>

              {returnLocked ? (
                <div
                  style={{
                    ...NOTICE_STYLES.info,
                    borderRadius: 18,
                    padding: '14px 16px',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                  }}
                >
                  Ảnh trả xe đã được chốt cho bước hiện tại. Nếu cần bổ sung, vui lòng liên hệ showroom.
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 20,
                    padding: 14,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <FileUpload
                    key={`return-${workflow.updatedAt || 'empty'}-${booking?.id || 'booking'}`}
                    label="Ảnh trả xe"
                    hint="Ảnh trả xe đầu tiên được gửi lên server để AI so với ảnh nhận xe đã lưu (cùng booking)."
                    multiple
                    autoUpload={false}
                    onFiles={setReturnFiles}
                  />
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', marginBottom: 10 }}>
                  Ảnh đã lưu cho biên bản trả xe
                </div>
                {renderSavedImages(workflow.returnImages || [])}
              </div>

              <div
                style={{
                  marginTop: 14,
                  borderRadius: 18,
                  padding: 16,
                  background: hasAiInspectionReport ? aiInspectionMeta.bg : '#f8fafc',
                  border: `1px solid ${hasAiInspectionReport ? aiInspectionMeta.border : '#e2e8f0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: '#fff',
                      color: hasAiInspectionReport ? aiInspectionMeta.color : '#2563eb',
                    }}
                  >
                    <FaRobot />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#111827' }}>Báo cáo AI thiệt hại phát sinh</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      Kết quả phân tích được lưu trên server theo booking; showroom và bạn xem lại tại mục Báo cáo AI.
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        padding: '6px 10px',
                        background: '#ecfdf5',
                        border: '1px solid #86efac',
                        color: '#166534',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      Trạng thái: {aiPhaseHeadline}
                    </div>
                  </div>
                </div>

                {!receiveReferenceImage ? (
                  <div style={{ fontSize: '0.8rem', color: '#9a3412', lineHeight: 1.65 }}>
                    Chưa có ảnh nhận xe đối chiếu — hãy lưu bước nhận xe (upload ảnh) trước; ảnh trước thuê chính thức từ
                    showroom (nếu có) sẽ bổ sung sau trên backend.
                  </div>
                ) : hasAiInspectionReport ? (
                  <>
                    <div style={{ fontWeight: 800, color: aiInspectionMeta.color, marginBottom: 6 }}>
                      {aiInspectionMeta.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65, marginBottom: 12 }}>
                      {aiInspectionMeta.description}
                    </div>
                    <button
                      type="button"
                      className="renter-btn-soft"
                      onClick={() => navigate(`/renter/ai-reports?bookingId=${booking.id}`)}
                      style={{ justifyContent: 'center' }}
                    >
                      Xem báo cáo AI đầy đủ
                    </button>
                  </>
                ) : serverAi?.status === 'failed' ? (
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.65 }}>
                    <div style={{ marginBottom: 10 }}>{serverAi?.error_message || 'Phân tích thất bại.'}</div>
                    <button
                      type="button"
                      className="renter-btn-soft"
                      disabled={savingSection === 'return' || aiGenerateLoading}
                      onClick={() => handleSaveSection('return')}
                      style={{ justifyContent: 'center' }}
                    >
                      Thử lại phân tích AI
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65 }}>
                    Sau khi bạn bấm «Lưu biên bản» ở bước trả xe, hệ thống sẽ gửi ảnh lên server và chạy AI.{' '}
                    {aiGenerateLoading || serverAi?.status === 'pending'
                      ? 'Đang phân tích AI...'
                      : 'Chưa có báo cáo trên server cho booking này.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...baseCardStyle, ...noticeTheme }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <FaInfoCircle />
                <div style={{ fontWeight: 800 }}>Trạng thái gửi trả xe</div>
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.7 }}>{returnStateMeta.description}</div>
            </div>

            <div style={baseCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#fef3c7',
                    color: '#d97706',
                  }}
                >
                  <FaCamera />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Hướng dẫn chụp ảnh</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Bộ ảnh rõ ràng sẽ giúp showroom xác nhận trả xe nhanh hơn.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {RETURN_PHOTO_TIPS.map((tip) => (
                  <div
                    key={tip}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      borderRadius: 16,
                      padding: '12px 13px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: '#dcfce7',
                        color: '#16a34a',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.72rem',
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <FaCheckCircle />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>{tip}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                ...baseCardStyle,
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fff9 100%)',
                borderColor: '#d1fae5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#ecfdf5',
                    color: '#059669',
                  }}
                >
                  <FaClipboardCheck />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Tom tat truoc khi gui</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Kiểm tra nhanh xem bộ hồ sơ trả xe đã sẵn sàng chưa.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
                {summaryStats.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #dcfce7',
                      background: '#fff',
                      padding: '12px 10px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>{item.value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, fontSize: '0.78rem', color: '#475569' }}>
                  <span>Muc do san sang</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{returnProgressPercent}%</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: '#e5e7eb',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${returnProgressPercent}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  padding: '14px 14px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#6b7280', marginBottom: 8 }}>
                  <FaCalendarAlt />
                  Khung thời gian trả xe
                </div>
                <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                  {returnDueDate ? formatDateTime(returnDueDate) : 'Ngày kết thúc chuyến'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.6 }}>
                  {returnWindowOpened
                    ? 'Bạn có thể lưu hồ sơ trả xe cục bộ trên trình duyệt ngay lúc này (vẫn nên liên hệ showroom để đóng booking trên hệ thống).'
                    : 'Theo lịch thuê, mốc trả xe chưa tới — bạn vẫn có thể chuẩn bị ảnh/ghi chú trước; lưu hồ sơ đầy đủ sau khi đến hạn.'}
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
                {workflow.returnNote?.trim()
                  ? `Ghi chú hiện tại: "${workflow.returnNote.trim().slice(0, 120)}${workflow.returnNote.trim().length > 120 ? '...' : ''}"`
                  : 'Chưa có ghi chú nào được thêm cho biên bản trả xe.'}
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveSection('return')}
                disabled={savingSection === 'return' || actionDisabled}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  opacity: savingSection === 'return' || actionDisabled ? 0.7 : 1,
                  minHeight: 46,
                }}
              >
                {savingSection === 'return'
                  ? 'Đang lưu hồ sơ trả xe...'
                  : returnLocked
                    ? 'Đã lưu hồ sơ trả xe (cục bộ)'
                    : 'Lưu hồ sơ trả xe (cục bộ) & liên hệ showroom'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.74rem', color: '#6b7280' }}>
                <FaInfoCircle />
                Thao tác «Lưu hồ sơ trả xe» chỉ lưu cục bộ trên trình duyệt. Trạng thái booking trên server chỉ
                đổi khi showroom xử lý — vui lòng liên hệ showroom nếu cần xác nhận gấp.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChecklist = (title, fields, sectionKey, noteKey, imageKey, filesSetter, files, saveKey, options = {}) => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FaClipboardCheck style={{ color: '#00b14f' }} />
        <div style={{ fontWeight: 800, color: '#111827' }}>{title}</div>
      </div>

      {options.notice && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 12,
            fontSize: '0.8rem',
            lineHeight: 1.6,
            background:
              options.notice.tone === 'warning'
                ? '#fff7ed'
                : options.notice.tone === 'success'
                  ? '#f0fdf4'
                  : '#eff6ff',
            border:
              options.notice.tone === 'warning'
                ? '1px solid #fdba74'
                : options.notice.tone === 'success'
                  ? '1px solid #86efac'
                  : '1px solid #bfdbfe',
            color:
              options.notice.tone === 'warning'
                ? '#9a3412'
                : options.notice.tone === 'success'
                  ? '#166534'
                  : '#1d4ed8',
          }}
        >
          {options.notice.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {fields.map((field) => (
          <label
            key={field.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: workflow[sectionKey][field.key] ? '#f0fdf4' : '#fff',
              cursor: options.readOnly ? 'default' : 'pointer',
              opacity: options.readOnly ? 0.8 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(workflow[sectionKey][field.key])}
              onChange={() => !options.readOnly && toggleChecklist(sectionKey, field.key)}
              disabled={options.readOnly}
              style={{ accentColor: '#00b14f', width: 16, height: 16 }}
            />
            <span style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 500 }}>{field.label}</span>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Ghi chu</label>
        <textarea
          rows={3}
          value={workflow[noteKey]}
          onChange={(event) =>
            !options.readOnly &&
            setWorkflow((current) => ({
              ...current,
              [noteKey]: event.target.value,
            }))
          }
          disabled={options.readOnly}
          placeholder="Ghi lại tình trạng xe, vật dụng đi kèm, trao đổi với showroom..."
          style={{
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: '0.84rem',
            resize: 'vertical',
            boxSizing: 'border-box',
            background: options.readOnly ? '#f9fafb' : '#fff',
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        {options.readOnly ? (
          <div
            style={{
              border: '1px dashed #d1d5db',
              borderRadius: 12,
              padding: '12px 14px',
              background: '#f9fafb',
              fontSize: '0.8rem',
              color: '#6b7280',
            }}
          >
            Ảnh trả xe đã được chốt cho bước hiện tại. Nếu cần bổ sung, vui lòng liên hệ showroom.
          </div>
        ) : (
          <FileUpload
            key={`${saveKey}-${workflow.updatedAt || 'empty'}-${booking?.id || 'booking'}`}
            label="Ảnh đối chiếu"
            hint={
              options.uploadHint ||
              'Ảnh này được upload lên storage. Quy trình renter vẫn đang lưu cục bộ trên trình duyệt hiện tại — đổi trình duyệt hoặc xóa dữ liệu cục bộ có thể làm mất lịch sử đối chiếu.'
            }
            multiple
            autoUpload={false}
            onFiles={filesSetter}
          />
        )}
      </div>

      {Array.isArray(workflow[imageKey]) && workflow[imageKey].length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>
            Ảnh đã lưu
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
            {workflow[imageKey].map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f9fafb' }}
              >
                <img src={url} alt="Rental evidence" style={{ width: '100%', height: 88, objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
          {files.length > 0 ? `${files.length} file đang chờ lưu.` : 'Có thể lưu checklist mà không cần chọn thêm ảnh.'}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSaveSection(saveKey)}
          disabled={savingSection === saveKey || options.disableSave}
          style={{ opacity: savingSection === saveKey || options.disableSave ? 0.65 : 1 }}
        >
          {savingSection === saveKey ? 'Đang lưu...' : options.saveLabel || 'Lưu biên bản'}
        </button>
      </div>
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quy trình trả xe — ${booking?.vehicleName || ''}`}
      width={1040}
    >
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
            <strong>Checklist trả xe vẫn là bản nháp cục bộ trên trình duyệt;</strong> ảnh upload lên storage và{' '}
            <strong>báo cáo AI được lưu trên server theo booking</strong>. Trạng thái trả xe trên hệ thống do showroom xác nhận;
            AI là tài liệu đối chiếu hỗ trợ.
          </div>

          {false && (
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
            FE cho phép lưu biên bản trả xe và chuẩn bị tài liệu; việc cập nhật trạng thái trả xe trên server do showroom thực hiện.
            Nếu backend chưa đẩy kịp trạng thái ả xe, giao diện sẽ mở flow theo lịch thuê thực tế.
          </div>
          )}

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
              Booking hiện đang ở trạng thái «{booking.status}», nhưng FE đã mở giao diện trả xe theo mốc thời gian
              của lịch thuê để renter có thể tiếp tục chuẩn bị trả xe đúng hạn.
            </div>
          )}

          <div style={{ background: '#f9fafb', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{booking.vehicleName}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaStore size={11} /> {booking.showroomName}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaCalendarAlt size={11} /> {formatDateTime(booking.startDate)} - {formatDateTime(booking.endDate)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaMapMarkerAlt size={11} /> {booking.locationLabel}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={booking.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {FLOW_STEPS.map((step, index) => {
                const isDone = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div
                    key={step.status}
                    style={{
                      borderRadius: 14,
                      padding: '12px 10px',
                      border: `1px solid ${isCurrent ? '#86efac' : '#e5e7eb'}`,
                      background: isCurrent ? '#f0fdf4' : isDone ? '#f9fafb' : '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        margin: '0 auto 8px',
                        borderRadius: '50%',
                        background: isCurrent ? '#00b14f' : isDone ? '#d1fae5' : '#f3f4f6',
                        color: isCurrent ? '#fff' : isDone ? '#059669' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                      }}
                    >
                      {isDone ? <FaCheckCircle /> : index + 1}
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#374151' }}>{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

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
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: '12px 14px', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {notice && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 12, padding: '12px 14px', fontSize: '0.82rem' }}>
              {notice}
            </div>
          )}

          {canHandleReceive && renderChecklist(
            `Biên bản nhận xe (${receiveChecklistCount}/${RECEIVE_FIELDS.length})`,
            RECEIVE_FIELDS,
            'receiveChecklist',
            'receiveNote',
            'receiveImages',
            setReceiveFiles,
            receiveFiles,
            'receive'
          )}

          {canHandleReturn && renderReturnExperience()}

          {!canHandleReceive && !canHandleReturn && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, color: '#6b7280', fontSize: '0.84rem' }}>
              Booking này chưa đến giai đoạn trả xe. Khi booking chuyển sang bàn giao hoặc đang sử dụng,
              renter sẽ thấy quy trình checklist tương ứng tại đây.
            </div>
          )}
        </div>
      )}
    </Modal>

    {booking && (
      <RentalContractViewerModal
        isOpen={contractViewerOpen}
        bookingId={booking.id}
        onClose={() => setContractViewerOpen(false)}
      />
    )}
    </>
  );
};

export default RentalFlowModal;
