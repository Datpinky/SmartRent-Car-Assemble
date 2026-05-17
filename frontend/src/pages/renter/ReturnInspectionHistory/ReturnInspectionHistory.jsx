import { useCallback, useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaClock, FaHistory, FaInfoCircle, FaSpinner } from 'react-icons/fa';
import inspectionService from '../../../services/inspectionService';

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

const ReturnInspectionHistory = () => {
  const [historyRows, setHistoryRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const publishedRows = historyRows.filter((r) => r.published_to_renter);
  const pendingRows = historyRows.filter((r) => !r.published_to_renter);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>
          Kết quả AI trả xe
        </h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: '#6b7280' }}>
          Chỉ xem ảnh và kết quả phân tích sau khi showroom xác nhận. Bạn không thể chạy AI tại đây.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 20,
          padding: 14,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 12,
          color: '#1e40af',
          fontSize: '0.88rem',
          lineHeight: 1.55,
        }}
      >
        <FaInfoCircle style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          {pendingRows.length > 0 ? (
            <span>
              Showroom đang kiểm tra ảnh trả xe. Kết quả AI sẽ hiển thị sau khi showroom xác nhận.
            </span>
          ) : (
            <span>
              Khi có biên bản trả xe, bạn sẽ thấy ảnh tại đây. Kết quả AI chỉ xuất hiện sau khi showroom xác nhận.
            </span>
          )}
        </div>
      </div>

      {loadingHistory && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <FaSpinner className="animate-spin" style={{ marginRight: 8 }} /> Đang tải...
        </div>
      )}

      {!loadingHistory && publishedRows.length === 0 && (
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
          <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
            Chưa có kết quả AI trả xe đã được showroom xác nhận.
          </p>
        </div>
      )}

      {!loadingHistory &&
        publishedRows.map((row) => (
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
                    ({row.vehicle_plate || 'N/A'})
                  </span>
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
                  {fmtDate(row.confirmed_at || row.updatedAt)}
                </div>
              </div>
              <div style={{ color: '#9ca3af', fontSize: '1.2rem' }}>
                {expandedRow === row._id ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </button>

            {expandedRow === row._id && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: '#f9fafb' }}>
                {(row.pickup_images || []).length > 0 || (row.return_images || []).length > 0 ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12, color: '#374151' }}>
                      Hình ảnh
                    </div>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                      {(row.pickup_images || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginBottom: 6, fontWeight: 700 }}>
                            BEFORE
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(row.pickup_images || []).map((url, i) => (
                              <a key={url || i} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt="before"
                                  style={{
                                    width: '72px',
                                    height: '52px',
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    border: '2px solid #bfdbfe',
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {(row.return_images || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: 6, fontWeight: 700 }}>
                            AFTER
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(row.return_images || []).map((url, i) => (
                              <a key={url || i} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt="after"
                                  style={{
                                    width: '72px',
                                    height: '52px',
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    border: '2px solid #86efac',
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {(row.summary || row.ai_payload?.summary) && (
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                      Tóm tắt AI (đã xác nhận):
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                      {row.summary || row.ai_payload?.summary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default ReturnInspectionHistory;
