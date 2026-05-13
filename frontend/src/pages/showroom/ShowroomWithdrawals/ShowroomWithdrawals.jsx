import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaHistory,
  FaMoneyBillWave,
  FaSearch,
  FaSpinner,
  FaTimesCircle,
  FaWallet,
} from 'react-icons/fa';
import withdrawalService from '../../../services/withdrawalService';

const fmtVnd = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');
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

// ─── Vietnamese banks list ────────────────────────────────────────────────────
const BANKS = [
  { code: 'VCB', name: 'Vietcombank', full: 'Ngân hàng TMCP Ngoại thương Việt Nam', color: '#006B3F' },
  { code: 'BIDV', name: 'BIDV', full: 'Ngân hàng TMCP Đầu tư và Phát triển VN', color: '#00408B' },
  { code: 'CTG', name: 'VietinBank', full: 'Ngân hàng TMCP Công thương Việt Nam', color: '#C8002A' },
  { code: 'AGR', name: 'Agribank', full: 'Ngân hàng Nông nghiệp và PTNT VN', color: '#D4232A' },
  { code: 'TCB', name: 'Techcombank', full: 'Ngân hàng TMCP Kỹ thương Việt Nam', color: '#D40000' },
  { code: 'MB', name: 'MB Bank', full: 'Ngân hàng TMCP Quân đội', color: '#003087' },
  { code: 'ACB', name: 'ACB', full: 'Ngân hàng TMCP Á Châu', color: '#0066B3' },
  { code: 'VPB', name: 'VPBank', full: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', color: '#00863D' },
  { code: 'TPB', name: 'TPBank', full: 'Ngân hàng TMCP Tiên Phong', color: '#5C0F8B' },
  { code: 'STB', name: 'Sacombank', full: 'Ngân hàng TMCP Sài Gòn Thương Tín', color: '#003087' },
  { code: 'HDB', name: 'HDBank', full: 'Ngân hàng TMCP Phát triển TP.HCM', color: '#C8002A' },
  { code: 'VIB', name: 'VIB', full: 'Ngân hàng Quốc tế Việt Nam', color: '#0066B3' },
  { code: 'MSB', name: 'MSB', full: 'Ngân hàng TMCP Hàng Hải Việt Nam', color: '#E31837' },
  { code: 'OCB', name: 'OCB', full: 'Ngân hàng TMCP Phương Đông', color: '#FF6B00' },
  { code: 'SHB', name: 'SHB', full: 'Ngân hàng TMCP Sài Gòn - Hà Nội', color: '#C8002A' },
  { code: 'EIB', name: 'Eximbank', full: 'Ngân hàng TMCP Xuất Nhập khẩu VN', color: '#003087' },
  { code: 'SEA', name: 'SeABank', full: 'Ngân hàng TMCP Đông Nam Á', color: '#E31837' },
  { code: 'LPB', name: 'LienVietPostBank', full: 'Ngân hàng TMCP Bưu điện Liên Việt', color: '#E31837' },
  { code: 'NAB', name: 'Nam A Bank', full: 'Ngân hàng TMCP Nam Á', color: '#004B8D' },
  { code: 'ABB', name: 'ABBank', full: 'Ngân hàng TMCP An Bình', color: '#D40000' },
  { code: 'PVC', name: 'PVcomBank', full: 'Ngân hàng TMCP Đại Chúng Việt Nam', color: '#006B3F' },
  { code: 'KLB', name: 'Kienlongbank', full: 'Ngân hàng TMCP Kiên Long', color: '#003087' },
  { code: 'BVB', name: 'BVBank', full: 'Ngân hàng TMCP Bản Việt', color: '#E31837' },
];

// Avatar chữ cái + màu ngân hàng
const BankAvatar = ({ bank, size = 32 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 4,
      background: bank.color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: size * 0.32,
      flexShrink: 0,
      letterSpacing: '-0.5px',
    }}
  >
    {bank.code.slice(0, 3)}
  </div>
);

// ─── Bank picker dropdown ─────────────────────────────────────────────────────
const BankPicker = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const selected = BANKS.find((b) => b.name === value) || null;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.trim()
    ? BANKS.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.code.toLowerCase().includes(search.toLowerCase()) ||
          b.full.toLowerCase().includes(search.toLowerCase()),
      )
    : BANKS;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 12px',
          borderRadius: 10,
          border: '1.5px solid #d1d5db',
          background: disabled ? '#f9fafb' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        {selected ? (
          <>
            <BankAvatar bank={selected} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{selected.name}</div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.full}
              </div>
            </div>
          </>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: '0.88rem', flex: 1 }}>Chọn ngân hàng...</span>
        )}
        <FaChevronDown
          style={{
            color: '#9ca3af',
            fontSize: '0.75rem',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FaSearch style={{ color: '#9ca3af', fontSize: '0.8rem', flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã ngân hàng..."
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '0.85rem',
                color: '#111827',
                background: 'transparent',
              }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
                Không tìm thấy ngân hàng
              </div>
            ) : (
              filtered.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onChange(bank.name);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 14px',
                    border: 'none',
                    background: selected?.code === bank.code ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderLeft: selected?.code === bank.code ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (selected?.code !== bank.code) e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    if (selected?.code !== bank.code) e.currentTarget.style.background = '#fff';
                  }}
                >
                  <BankAvatar bank={bank} size={34} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{bank.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{bank.full}</div>
                  </div>
                  {selected?.code === bank.code && (
                    <FaCheckCircle style={{ marginLeft: 'auto', color: '#2563eb', fontSize: '0.85rem' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fffbeb', icon: FaClock },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#f0fdf4', icon: FaCheckCircle },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', icon: FaTimesCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 8,
        padding: '3px 10px',
        fontSize: '0.78rem',
        fontWeight: 700,
      }}
    >
      <Icon style={{ fontSize: '0.75rem' }} /> {cfg.label}
    </span>
  );
};

const INITIAL_FORM = { amount: '', bank_name: '', bank_account: '', bank_holder: '', note: '' };

const ShowroomWithdrawals = () => {
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const data = await withdrawalService.getBalance();
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await withdrawalService.listMy({ limit: 50 });
      setHistory(data?.items || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, [loadBalance, loadHistory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amount = Number(form.amount);
    if (!amount || amount < 10000) {
      setFormError('Số tiền rút tối thiểu là 10.000 ₫');
      return;
    }
    if (balance && amount > balance.available) {
      setFormError(`Số tiền vượt quá số dư khả dụng (${fmtVnd(balance.available)})`);
      return;
    }
    if (!form.bank_name.trim() || !form.bank_account.trim() || !form.bank_holder.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin ngân hàng');
      return;
    }

    setSubmitting(true);
    try {
      await withdrawalService.createRequest({
        amount,
        bank_name: form.bank_name.trim(),
        bank_account: form.bank_account.trim(),
        bank_holder: form.bank_holder.trim(),
        note: form.note.trim(),
      });
      setFormSuccess('Yêu cầu rút tiền đã được gửi. Admin sẽ xử lý trong 1–3 ngày làm việc.');
      setForm(INITIAL_FORM);
      loadBalance();
      loadHistory();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPending = history.some((r) => r.status === 'pending');

  return (
    <div>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Rút tiền</h1>
          <p className="page-subtitle">Quản lý yêu cầu rút tiền doanh thu từ cho thuê xe</p>
        </div>
      </div>

      {/* ── Balance cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Tổng doanh thu', key: 'totalEarned', icon: FaMoneyBillWave, color: '#2563eb' },
          { label: 'Đã rút', key: 'totalWithdrawn', icon: FaCheckCircle, color: '#059669' },
          { label: 'Đang chờ duyệt', key: 'totalPending', icon: FaClock, color: '#d97706' },
          { label: 'Số dư khả dụng', key: 'available', icon: FaWallet, color: '#7c3aed' },
        ].map(({ label, key, icon: Icon, color }) => (
          <div
            key={key}
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #f1f5f9',
              padding: '20px 22px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icon style={{ color, fontSize: '1.1rem' }} />
              <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>{label}</span>
            </div>
            {balanceLoading ? (
              <FaSpinner className="animate-spin" style={{ color: '#9ca3af' }} />
            ) : (
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color }}>{fmtVnd(balance?.[key])}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        {/* ── Withdrawal form ── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #e2e8f0',
            padding: 26,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontWeight: 800,
              color: '#1e3a5f',
              marginBottom: 20,
              fontSize: '0.97rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaMoneyBillWave style={{ color: '#2563eb', fontSize: '0.9rem' }} />
            </div>
            Tạo yêu cầu rút tiền
          </h3>

          {hasPending && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 18,
                fontSize: '0.82rem',
                color: '#92400e',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <FaClock style={{ marginTop: 1, flexShrink: 0 }} />
              Bạn đang có một yêu cầu đang chờ duyệt. Vui lòng chờ admin xử lý trước khi tạo yêu cầu mới.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Amount */}
            <div>
              <label style={labelStyle}>Số tiền muốn rút (VNĐ) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0"
                  min={10000}
                  max={balance?.available || 0}
                  disabled={hasPending || submitting}
                  style={{ ...inputStyle, paddingRight: 48, fontWeight: 700, fontSize: '1rem' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.78rem',
                    color: '#9ca3af',
                    fontWeight: 600,
                  }}
                >
                  VNĐ
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                  Tối thiểu: <strong>10.000 ₫</strong>
                </span>
                {balance && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: '#2563eb',
                      fontWeight: 600,
                      cursor: hasPending || submitting ? 'default' : 'pointer',
                    }}
                    onClick={() => {
                      if (!hasPending && !submitting && balance?.available > 0) {
                        setForm((p) => ({ ...p, amount: String(balance.available) }));
                        setFormError('');
                        setFormSuccess('');
                      }
                    }}
                  >
                    Khả dụng: {fmtVnd(balance.available)} {!hasPending && '(Rút tất cả)'}
                  </span>
                )}
              </div>
              {form.amount && Number(form.amount) >= 10000 && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    color: '#15803d',
                    fontWeight: 600,
                  }}
                >
                  = {fmtVnd(Number(form.amount))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px dashed #e5e7eb', margin: '2px 0' }} />
            <div
              style={{
                fontSize: '0.78rem',
                color: '#6b7280',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Thông tin tài khoản nhận tiền
            </div>

            {/* Bank picker */}
            <div>
              <label style={labelStyle}>Ngân hàng *</label>
              <BankPicker
                value={form.bank_name}
                onChange={(name) => {
                  setForm((p) => ({ ...p, bank_name: name }));
                  setFormError('');
                  setFormSuccess('');
                }}
                disabled={hasPending || submitting}
              />
            </div>

            {/* Account number */}
            <div>
              <label style={labelStyle}>Số tài khoản *</label>
              <input
                type="text"
                name="bank_account"
                value={form.bank_account}
                onChange={(e) => {
                  setForm((p) => ({ ...p, bank_account: e.target.value.replace(/\D/g, '') }));
                  setFormError('');
                  setFormSuccess('');
                }}
                placeholder="Nhập số tài khoản"
                inputMode="numeric"
                disabled={hasPending || submitting}
                style={{ ...inputStyle, letterSpacing: '0.08em', fontWeight: 600 }}
              />
            </div>

            {/* Account holder */}
            <div>
              <label style={labelStyle}>Tên chủ tài khoản *</label>
              <input
                type="text"
                name="bank_holder"
                value={form.bank_holder}
                onChange={(e) => {
                  setForm((p) => ({ ...p, bank_holder: e.target.value.toUpperCase() }));
                  setFormError('');
                  setFormSuccess('');
                }}
                placeholder="NGUYEN VAN A"
                disabled={hasPending || submitting}
                style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>
                Nhập đúng tên in trên thẻ ngân hàng
              </span>
            </div>

            {/* Preview card */}
            {(form.bank_name || form.bank_account || form.bank_holder) && (
              <div
                style={{
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                  padding: '14px 16px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {form.bank_name &&
                  (() => {
                    const b = BANKS.find((x) => x.name === form.bank_name);
                    return b ? <BankAvatar bank={{ ...b, color: 'rgba(255,255,255,0.2)' }} size={38} /> : null;
                  })()}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', opacity: 0.85 }}>{form.bank_name || '—'}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em', marginTop: 2 }}>
                    {form.bank_account || '•••• •••• ••••'}
                  </div>
                  <div style={{ fontSize: '0.76rem', opacity: 0.7, marginTop: 2 }}>
                    {form.bank_holder || 'TÊN CHỦ TÀI KHOẢN'}
                  </div>
                </div>
                {form.amount && Number(form.amount) >= 10000 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Số tiền</div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{fmtVnd(Number(form.amount))}</div>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label style={labelStyle}>Ghi chú (tuỳ chọn)</label>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="Ghi chú thêm cho admin..."
                rows={2}
                disabled={hasPending || submitting}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {formError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                }}
              >
                {formError}
              </div>
            )}
            {formSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#15803d',
                  fontSize: '0.82rem',
                }}
              >
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={hasPending || submitting || balanceLoading}
              style={{
                background: hasPending ? '#9ca3af' : 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px 0',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: hasPending || submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: hasPending ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                transition: 'opacity 0.2s',
              }}
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" /> Đang gửi...
                </>
              ) : (
                <>
                  <FaMoneyBillWave /> Gửi yêu cầu rút tiền
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── History ── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #e2e8f0',
            padding: 26,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontWeight: 800,
              color: '#1e3a5f',
              marginBottom: 18,
              fontSize: '0.97rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaHistory style={{ color: '#7c3aed', fontSize: '0.9rem' }} />
            </div>
            Lịch sử yêu cầu
          </h3>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <FaSpinner className="animate-spin" style={{ fontSize: '1.4rem', marginBottom: 10 }} />
              <div style={{ fontSize: '0.82rem' }}>Đang tải...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <FaHistory style={{ color: '#d1d5db', fontSize: '1.4rem' }} />
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.84rem' }}>Chưa có yêu cầu rút tiền nào.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((req) => {
                const bank = BANKS.find((b) => b.name === req.bank_name);
                return (
                  <div
                    key={req._id}
                    style={{
                      border: '1.5px solid #f1f5f9',
                      borderRadius: 14,
                      padding: '14px 16px',
                      background: '#fafbff',
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {bank ? (
                          <BankAvatar bank={bank} size={36} />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 9,
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#6b7280',
                            }}
                          >
                            BNK
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e3a5f', fontSize: '1rem' }}>
                            {fmtVnd(req.amount)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {req.bank_name} · {fmtDate(req.createdAt)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 9,
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        color: '#374151',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: '#9ca3af', minWidth: 80 }}>Số TK:</span>
                        <strong style={{ letterSpacing: '0.06em' }}>{req.bank_account}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: '#9ca3af', minWidth: 80 }}>Chủ TK:</span>
                        <strong>{req.bank_holder}</strong>
                      </div>
                      {req.note && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ color: '#9ca3af', minWidth: 80 }}>Ghi chú:</span>
                          <span>{req.note}</span>
                        </div>
                      )}
                      {req.admin_note && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: '5px 8px',
                            borderRadius: 6,
                            background: req.status === 'rejected' ? '#fef2f2' : '#f0fdf4',
                            color: req.status === 'rejected' ? '#dc2626' : '#15803d',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                          }}
                        >
                          Admin: {req.admin_note}
                        </div>
                      )}
                      {req.processed_at && (
                        <div style={{ color: '#9ca3af', fontSize: '0.74rem' }}>
                          Xử lý lúc: {fmtDate(req.processed_at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontWeight: 600,
  color: '#374151',
  fontSize: '0.82rem',
  marginBottom: 5,
};
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: '0.88rem',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

export default ShowroomWithdrawals;
