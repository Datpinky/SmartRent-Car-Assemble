import { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaHistory, FaMoneyBillWave, FaSpinner, FaWallet } from 'react-icons/fa';
import withdrawalService from '../../../services/withdrawalService';
import BankAvatar from './components/BankAvatar';
import BankPicker from './components/BankPicker';
import WithdrawalStatusBadge from './components/WithdrawalStatusBadge';
import { BANKS, fmtDate, fmtVnd, INITIAL_FORM } from './showroomWithdrawals.helpers';

const ShowroomWithdrawals = () => {
  const [balance, setBalance] = useState({ available: 0, total_earned: 0, pending_withdrawal: 0, total_withdrawn: 0 });
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = useCallback(async () => {
    setBalanceLoading(true);
    setHistoryLoading(true);
    try {
      const [balanceData, historyData] = await Promise.all([
        withdrawalService.getBalance(),
        withdrawalService.listMy({ limit: 50 }),
      ]);
      setBalance(balanceData || { available: 0, total_earned: 0, pending_withdrawal: 0, total_withdrawn: 0 });
      setHistory(
        historyData?.items ||
          historyData?.requests ||
          historyData?.data ||
          (Array.isArray(historyData) ? historyData : []),
      );
    } catch (err) {
      setFormError(err.message || 'Không thể tải dữ liệu ví.');
    } finally {
      setBalanceLoading(false);
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    const amount = Number(form.amount);
    if (!amount || amount < 10000) {
      setFormError('Số tiền rút tối thiểu là 10.000 VND');
      return;
    }
    if (!form.bank_name) {
      setFormError('Vui lòng chọn ngân hàng');
      return;
    }
    if (!form.bank_account.trim()) {
      setFormError('Vui lòng nhập số tài khoản');
      return;
    }
    if (!form.bank_holder.trim()) {
      setFormError('Vui lòng nhập tên chủ tài khoản');
      return;
    }
    setSubmitting(true);
    try {
      await withdrawalService.createRequest({
        amount,
        bank_name: form.bank_name,
        bank_account: form.bank_account.trim(),
        bank_holder: form.bank_holder.trim(),
        note: form.note.trim(),
      });
      setFormSuccess('Yêu cầu rút tiền đã được gửi thành công!');
      setForm(INITIAL_FORM);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBank = BANKS.find((b) => b.name === form.bank_name || b.code === form.bank_name);

  const BALANCE_CARDS = [
    {
      label: 'Số dư khả dụng',
      value: balance.available,
      accent: '#00b14f',
      tint: 'rgba(0,177,79,0.1)',
      Icon: FaWallet,
    },
    {
      label: 'Tổng doanh thu',
      value: balance.total_earned,
      accent: '#2563eb',
      tint: 'rgba(37,99,235,0.1)',
      Icon: FaMoneyBillWave,
    },
    {
      label: 'Đang xử lý rút',
      value: balance.pending_withdrawal,
      accent: '#d97706',
      tint: 'rgba(217,119,6,0.1)',
      Icon: FaSpinner,
    },
    {
      label: 'Tổng đã rút',
      value: balance.total_withdrawn,
      accent: '#7c3aed',
      tint: 'rgba(124,58,237,0.1)',
      Icon: FaCheckCircle,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#111827' }}>Quản lý rút tiền</h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
          Yêu cầu rút tiền từ ví showroom về tài khoản ngân hàng của bạn.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {BALANCE_CARDS.map(({ label, value, accent, tint, Icon }) => (
          <div
            key={label}
            style={{
              background: '#fff',
              borderRadius: 20,
              border: '1px solid #f1f5f9',
              padding: '18px 20px',
              boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#111827', marginTop: 8 }}>
                  {balanceLoading ? '…' : fmtVnd(value)}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: tint,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                <Icon />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {/* Withdrawal form */}
        <div
          style={{
            background: '#fff',
            borderRadius: 22,
            border: '1px solid #f1f5f9',
            padding: 24,
            boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#111827', marginBottom: 20 }}>
            Tạo yêu cầu rút tiền
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}
              >
                Số tiền rút (VND) *
              </label>
              <input
                type="number"
                min="10000"
                step="1000"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Ví dụ: 500000"
                required
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  color: '#111827',
                }}
              />
              <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: 4 }}>Tối thiểu 10.000 VND</div>
            </div>
            <div>
              <label
                style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}
              >
                Ngân hàng *
              </label>
              <BankPicker
                value={form.bank_name}
                onChange={(name) => setForm((f) => ({ ...f, bank_name: name }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label
                style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}
              >
                Số tài khoản *
              </label>
              <input
                type="text"
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                placeholder="Nhập số tài khoản ngân hàng"
                required
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  color: '#111827',
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}
              >
                Tên chủ tài khoản *
              </label>
              <input
                type="text"
                value={form.bank_holder}
                onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                placeholder="Nhập tên chủ tài khoản (IN HOA)"
                required
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  color: '#111827',
                  textTransform: 'uppercase',
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}
              >
                Ghi chú
              </label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Ghi chú thêm (nếu có)"
                rows={3}
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  color: '#111827',
                  resize: 'vertical',
                }}
              />
            </div>

            {selectedBank && form.amount && form.bank_account && (
              <div
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#6b7280',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  Xác nhận thông tin
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    [
                      'Ngân hàng',
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BankAvatar bank={selectedBank.code} size={22} />
                        <span style={{ fontWeight: 700 }}>{selectedBank.name}</span>
                      </span>,
                    ],
                    ['Tài khoản', form.bank_account],
                    ['Chủ TK', form.bank_holder],
                    ['Số tiền', <span style={{ color: '#00b14f', fontWeight: 900 }}>{fmtVnd(form.amount)}</span>],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        gap: 12,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.84rem',
                      }}
                    >
                      <span style={{ color: '#6b7280' }}>{k}:</span>
                      <span style={{ color: '#111827', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#b91c1c',
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
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#166534',
                }}
              >
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: submitting ? '#9ca3af' : '#00b14f',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {submitting ? (
                <>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý...
                </>
              ) : (
                'Gửi yêu cầu rút tiền'
              )}
            </button>
          </form>
        </div>

        {/* History */}
        <div
          style={{
            background: '#fff',
            borderRadius: 22,
            border: '1px solid #f1f5f9',
            padding: 24,
            boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <FaHistory style={{ color: '#6b7280' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#111827', margin: 0 }}>Lịch sử rút tiền</h2>
          </div>
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: '0.86rem' }}>
              Đang tải lịch sử...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: '0.86rem' }}>
              Chưa có yêu cầu rút tiền nào
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((item) => (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid #f1f5f9',
                    borderRadius: 16,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <BankAvatar bank={item.bank_name} size={36} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>{item.bank_name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
                          TK: {item.bank_account} · {item.bank_holder}
                        </div>
                      </div>
                    </div>
                    <WithdrawalStatusBadge status={item.status} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #f9fafb',
                      paddingTop: 10,
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#111827' }}>{fmtVnd(item.amount)}</span>
                    <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>{fmtDate(item.createdAt)}</span>
                  </div>
                  {item.note && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        background: '#f9fafb',
                        borderRadius: 10,
                        padding: '8px 12px',
                      }}
                    >
                      {item.note}
                    </div>
                  )}
                  {item.admin_note && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: item.status === 'rejected' ? '#b91c1c' : '#1d4ed8',
                        background: item.status === 'rejected' ? '#fef2f2' : '#eff6ff',
                        borderRadius: 10,
                        padding: '8px 12px',
                      }}
                    >
                      Admin: {item.admin_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowroomWithdrawals;
