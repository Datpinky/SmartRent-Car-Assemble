import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import StatusBadge from '../../../components/common/StatusBadge';
import {
  FaMoneyBillWave, FaDownload, FaCar, FaSpinner,
  FaFileContract, FaRobot, FaInfoCircle, FaUniversity,
  FaCheckCircle, FaExclamationTriangle,
} from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import { formatVnd } from '../../../utils/currencyFormat';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../services/vehicleService';
import { buildEmptyOwnerRevenueMonths } from '../../../utils/dashboardFromApi';

/* ── Helpers ─────────────────────────────────────────────── */
const genId = () => 'PT' + String(Date.now()).slice(-5);

const SmallChip = ({ children, tone = 'success' }) => {
  const map = {
    success: { bg: '#d1fae5', color: '#065f46' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    danger: { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[tone] || map.success;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: s.bg, color: s.color }}>
      {children}
    </span>
  );
};

/** Ngân hàng nhận tiền — nối API hồ sơ chủ xe khi có */
const BANK_ACCOUNTS = [];

const EMPTY_STATS = { total: 0, received: 0, pending: 0 };

/* Simulate POST /api/withdrawals */
const postWithdrawal = ({ amount, bankAccountId }) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (!amount || Number(amount) <= 0) reject(new Error('Số tiền không hợp lệ.'));
      else if (!bankAccountId)            reject(new Error('Vui lòng chọn tài khoản ngân hàng.'));
      else                                resolve({ id: genId(), status: 'processing' });
    }, 1200)
  );

/* ══════════════════════════════════════════════════════════ */
const Revenue = () => {
  const { user } = useAuth();
  /* ── Vehicle filter state ── */
  const [vehicles, setVehicles]               = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedId, setSelectedId]           = useState('all');
  const [stats, setStats]                     = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading]       = useState(false);
  const [chartData, setChartData]             = useState(() => buildEmptyOwnerRevenueMonths(6));
  const [chartLoading, setChartLoading]       = useState(false);

  /* ── Payout table ── */
  const [payouts, setPayouts]     = useState([]);
  const [detailTx, setDetailTx]   = useState(null);

  /* ── Withdraw dialog ── */
  const [wOpen, setWOpen]         = useState(false);
  const [wAmount, setWAmount]     = useState('');
  const [wAmtErr, setWAmtErr]     = useState('');
  const [wBankId, setWBankId]     = useState(BANK_ACCOUNTS[0]?.id ?? '');
  const [wLoading, setWLoading]   = useState(false);

  const [notice, setNotice] = useState(null);

  const exportPayoutsCsv = () => {
    const lines = [
      ['id', 'month', 'amount', 'method', 'date', 'status'].join(','),
      ...payouts.map((p) => [p.id, p.month, p.amount, p.method, p.date, p.status].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'owner-payouts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const prevId = useRef(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  /* ── Load vehicles (API) ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      try {
        if (!user?._id) {
          setVehicles([]);
          return;
        }
        const { data } = await vehicleService.getList({ added_by: user._id, limit: 100 });
        if (!cancelled) setVehicles(data || []);
      } catch {
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  /* ── Stats/chart: chờ API doanh thu theo chủ xe — hiện 0 + khung tháng ── */
  useEffect(() => {
    if (prevId.current === selectedId) return;
    prevId.current = selectedId;
    setStatsLoading(true);
    setChartLoading(true);
    setStats(EMPTY_STATS);
    setChartData(buildEmptyOwnerRevenueMonths(6));
    setStatsLoading(false);
    setChartLoading(false);
  }, [selectedId]);

  /* ── Open withdraw dialog ── */
  const openWithdraw = () => {
    setWAmount('');
    setWAmtErr('');
    setWBankId(BANK_ACCOUNTS.find((b) => b.primary)?.id ?? BANK_ACCOUNTS[0]?.id ?? '');
    setWOpen(true);
  };

  /* ── Amount validator ── */
  const validateAmt = (val) => {
    const n = Number(String(val).replace(/\D/g, ''));
    const avail = stats?.pending ?? 0;
    if (!val || isNaN(n) || n <= 0)  return 'Vui lòng nhập số tiền muốn rút.';
    if (n < 100_000)                  return 'Số tiền tối thiểu là 100.000 VNĐ.';
    if (n > avail)                    return `Vượt quá số dư (${formatVnd(avail)}).`;
    return '';
  };

  /* ── Submit withdrawal ── */
  const handleWithdraw = async () => {
    const err = validateAmt(wAmount);
    if (err) { setWAmtErr(err); return; }
    if (!BANK_ACCOUNTS.length) { setNotice({ type: 'error', msg: 'Chưa có tài khoản ngân hàng. Cập nhật trong Hồ sơ chủ xe.' }); return; }
    if (!wBankId) { setNotice({ type: 'error', msg: 'Vui lòng chọn tài khoản ngân hàng.' }); return; }

    const rawAmt   = Number(String(wAmount).replace(/\D/g, ''));
    const bankAcc  = BANK_ACCOUNTS.find((b) => b.id === wBankId);

    setWLoading(true);
    try {
      const result = await postWithdrawal({ amount: rawAmt, bankAccountId: wBankId });

      const today  = new Date();
      const dateStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

      const newRow = {
        id: result.id,
        month: `T${today.getMonth()+1}/${today.getFullYear()}`,
        amount: rawAmt,
        method: bankAcc ? `${bankAcc.bankName} ****${String(bankAcc.accountNo).slice(-4)}` : '—',
        date: dateStr,
        status: 'processing',
        detail: {
          rentalId: '—', vehicle: '—', renter: '—', period: '—',
          gross: rawAmt, platformFee: 0, damagePenalty: 0, net: rawAmt,
          aiDamages: [],
        },
        contractUrl: '#',
        aiReportUrl: '#',
      };

      setPayouts(prev => [newRow, ...prev]);
      setWOpen(false);
      setNotice({ type: 'success', msg: `✅ Yêu cầu rút ${formatVnd(rawAmt)} đã được gửi thành công!` });
    } catch (e) {
      setNotice({ type: 'error', msg: `❌ Lỗi: ${e.message}` });
    } finally {
      setWLoading(false);
    }
  };

  /* ── Derived ── */
  const selectedVehicle = vehicles.find((v) => String(v.id) === selectedId);
  const vehicleLabel    = selectedVehicle
    ? `${selectedVehicle.name} – ${selectedVehicle.plateNumber || '—'}`
    : 'Tất cả phương tiện';

  const STAT_CARDS = [
    { label: 'Tổng doanh thu', val: formatVnd(stats?.total    ?? 0), color: '#0891b2', sub: vehicleLabel },
    { label: 'Đã nhận',        val: formatVnd(stats?.received ?? 0), color: '#059669', sub: '90% tỷ lệ chi trả' },
    { label: 'Đang chờ rút',   val: formatVnd(stats?.pending  ?? 0), color: '#d97706', sub: 'Số dư khả dụng' },
    { label: 'Tỷ lệ chia sẻ',  val: '90%',                       color: '#7c3aed', sub: 'Chủ xe / SmartRent' },
  ];

  const inputCls =
    'w-full py-2.5 px-3 border border-gray-200 rounded-lg text-[0.85rem] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15';

  /* ════════════ RENDER ════════════ */
  return (
    <div>
      {notice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 10000,
            maxWidth: 380,
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            background: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notice.type === 'success' ? '#065f46' : '#b91c1c',
            border: notice.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
          }}
        >
          {notice.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Doanh thu &amp; Rút tiền</h1>
          <p className="page-subtitle">Theo dõi dòng tiền và yêu cầu rút tiền về tài khoản</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!BANK_ACCOUNTS.length) {
              setNotice({ type: 'error', msg: 'Chưa cấu hình tài khoản ngân hàng trong hệ thống. Vui lòng cập nhật Hồ sơ chủ xe hoặc liên hệ quản trị.' });
              return;
            }
            openWithdraw();
          }}
        >
          <FaMoneyBillWave aria-hidden="true" /> Yêu cầu rút tiền
        </button>
      </div>

      {/* ── 1. Vehicle filter ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #f0f0f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdDirectionsCar style={{ fontSize: '1.1rem', color: '#059669' }} aria-hidden="true" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Lọc theo phương tiện</span>
        </div>
        {vehiclesLoading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: '0.82rem' }}>
            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Đang tải…
          </span>
        ) : (
          <div style={{ position: 'relative', minWidth: 280 }}>
            <FaCar style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.85rem', pointerEvents: 'none' }} aria-hidden="true" />
            <select
              aria-label="Chọn xe"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', paddingLeft: 34, paddingRight: 28, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: '0.85rem', outline: 'none', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box', appearance: 'none' }}
            >
              <option value="all">🚗 Tất cả phương tiện</option>
              {vehicles.map((v) => <option key={v.id} value={String(v.id)}>{v.name} – {v.plateNumber || '—'}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', fontSize: '0.7rem' }} aria-hidden="true">▼</span>
          </div>
        )}
        {selectedVehicle && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ecfdf5', color: '#065f46', border: '1px solid #bbf7d0', borderRadius: 50, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
            <MdDirectionsCar aria-hidden="true" /> {selectedVehicle.name}
            <button
              type="button"
              onClick={() => setSelectedId('all')}
              aria-label="Xóa bộ lọc"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 0, lineHeight: 1 }}
            >✕</button>
          </span>
        )}
      </div>

      {/* ── 2. Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        {STAT_CARDS.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', opacity: statsLoading ? 0.55 : 1, transition: 'opacity 0.25s' }}>
            {statsLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                <FaSpinner style={{ color: '#059669', fontSize: '1.2rem', animation: 'spin 0.8s linear infinite' }} aria-hidden="true" />
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }} className="tabular-nums">{k.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 3. Bar chart ── */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="chart-title">
            Doanh thu &amp; Chi trả (VND)
            {selectedVehicle && <span style={{ marginLeft: 10, fontSize: '0.75rem', fontWeight: 500, color: '#059669' }}>— {selectedVehicle.name}</span>}
          </div>
          {chartLoading && <FaSpinner style={{ color: '#059669', animation: 'spin 0.8s linear infinite', marginRight: 4 }} aria-hidden="true" />}
        </div>
        <div style={{ opacity: chartLoading ? 0.45 : 1, transition: 'opacity 0.25s' }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1_000_000).toLocaleString('vi-VN')} tr VNĐ`} />
              <Tooltip formatter={(v, n) => [formatVnd(v), n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
              <Bar dataKey="revenue" name="Doanh thu"  fill="#0891b2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payouts" name="Đã chi trả" fill="#00b14f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 4. Payout history ── */}
      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Lịch sử chi trả</div>
          <button type="button" className="btn-outline" onClick={exportPayoutsCsv} style={{ fontSize: '0.78rem', padding: '5px 12px' }} title="Tải CSV lịch sử chi trả (dữ liệu hiển thị)">
            <FaDownload aria-hidden="true" /> Xuất CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Mã GD</th><th>Tháng</th><th>Số tiền</th>
                <th>Tài khoản</th><th>Ngày chi trả</th><th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id}>
                  <td><span className="code-badge">{p.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{p.month}</td>
                  <td style={{ fontWeight: 700, color: '#00b14f' }} className="tabular-nums">{formatVnd(p.amount)}</td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.method}</td>
                  <td>{p.date}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setDetailTx(p)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <FaInfoCircle aria-hidden="true" /> Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={wOpen}
        onClose={() => !wLoading && setWOpen(false)}
        title="Yêu cầu rút tiền"
        width={520}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => !wLoading && setWOpen(false)} disabled={wLoading}>
              Huỷ
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleWithdraw}
              disabled={wLoading || !wBankId || !BANK_ACCOUNTS.length}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {wLoading ? <FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true" /> : <FaMoneyBillWave aria-hidden="true" />}
              {wLoading ? 'Đang gửi…' : 'Xác nhận rút tiền'}
            </button>
          </>
        }
      >
        <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 2 }}>Số dư khả dụng</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', lineHeight: 1 }} className="tabular-nums">{formatVnd(stats?.pending ?? 0)}</div>
          </div>
          <FaCheckCircle style={{ fontSize: '2rem', color: '#86efac' }} aria-hidden="true" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="withdraw-amount" className="block text-[0.8rem] font-semibold text-gray-700 mb-1.5">Số tiền muốn rút (VNĐ)</label>
          <input
            id="withdraw-amount"
            name="amount"
            autoComplete="off"
            className={inputCls}
            placeholder="Ví dụ: 1000000"
            value={wAmount}
            onChange={(e) => {
              setWAmount(e.target.value);
              setWAmtErr(validateAmt(e.target.value));
            }}
            inputMode="numeric"
          />
          <div style={{ fontSize: '0.72rem', marginTop: 6, color: wAmtErr ? '#dc2626' : '#6b7280' }} role={wAmtErr ? 'alert' : undefined}>
            {wAmtErr || `Tối thiểu 100.000 VNĐ — Tối đa ${formatVnd(stats?.pending ?? 0)}`}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label htmlFor="withdraw-bank" className="block text-[0.8rem] font-semibold text-gray-700 mb-1.5">Tài khoản ngân hàng nhận tiền</label>
          <div style={{ position: 'relative' }}>
            <FaUniversity style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#059669', fontSize: '0.85rem', pointerEvents: 'none', zIndex: 1 }} aria-hidden="true" />
            <select
              id="withdraw-bank"
              className={inputCls}
              style={{ paddingLeft: 36, cursor: 'pointer', background: '#fff' }}
              value={wBankId}
              onChange={(e) => setWBankId(e.target.value)}
            >
              {BANK_ACCOUNTS.length === 0 && (
                <option value="">Chưa có tài khoản</option>
              )}
              {BANK_ACCOUNTS.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} ****{String(acc.accountNo).slice(-4)}
                  {acc.primary ? ' — Mặc định' : ''} — {acc.accountName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: '10px 12px', background: '#eff6ff', borderRadius: 9, border: '1px solid #bfdbfe' }}>
          <FaExclamationTriangle style={{ color: '#2563eb', marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: '0.78rem', color: '#1d4ed8', lineHeight: 1.5 }}>
            Yêu cầu xử lý trong <strong>1–3 ngày làm việc</strong>. Bạn sẽ nhận thông báo qua email khi hoàn tất.
          </span>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(detailTx)}
        onClose={() => setDetailTx(null)}
        title={detailTx ? `Chi tiết giao dịch — ${detailTx.id}` : 'Chi tiết'}
        width={520}
        footer={
          detailTx ? (
            <>
              <a
                href={detailTx.contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', textDecoration: 'none', borderColor: '#bfdbfe', color: '#2563eb' }}
              >
                <FaFileContract aria-hidden="true" /> Xem hợp đồng số
              </a>
              <a
                href={detailTx.aiReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', textDecoration: 'none', borderColor: '#ddd6fe', color: '#7c3aed' }}
              >
                <FaRobot aria-hidden="true" /> Xem báo cáo hư hỏng AI
              </a>
            </>
          ) : null
        }
      >
        {detailTx && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
              {[['Mã chuyến thuê', detailTx.detail.rentalId], ['Phương tiện', detailTx.detail.vehicle], ['Khách thuê', detailTx.detail.renter], ['Thời gian', detailTx.detail.period]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Bảng kê tài chính</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', marginBottom: 4 }}>
              <tbody>
                {[
                  { label: 'Doanh thu gộp', value: formatVnd(detailTx.detail.gross), color: '#059669' },
                  { label: 'Phí nền tảng (10%)', value: `-${formatVnd(detailTx.detail.platformFee)}`, color: '#dc2626' },
                  ...(detailTx.detail.damagePenalty > 0
                    ? [{ label: 'Khấu trừ hư hỏng (AI)', value: `-${formatVnd(detailTx.detail.damagePenalty)}`, color: '#d97706' }]
                    : []),
                  { label: 'Thực nhận (chủ xe)', value: formatVnd(detailTx.detail.net), color: '#059669', bold: true },
                ].map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6', color: row.bold ? '#111827' : '#6b7280', fontWeight: row.bold ? 700 : 400 }}>{row.label}</td>
                    <td style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: row.color, fontWeight: row.bold ? 800 : 600 }} className="tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detailTx.detail.aiDamages.length > 0 && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Chi tiết hư hỏng (AI)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#fef9ec' }}>
                      {['Hạng mục', 'Mức độ', 'Chi phí'].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left', padding: '7px 10px', fontWeight: 600, color: '#92400e', fontSize: '0.75rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailTx.detail.aiDamages.map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>{d.item}</td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>
                          <SmallChip tone={d.severity === 'Nhẹ' ? 'warning' : 'danger'}>{d.severity}</SmallChip>
                        </td>
                        <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#dc2626', fontWeight: 600 }} className="tabular-nums">-{formatVnd(d.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Revenue;
