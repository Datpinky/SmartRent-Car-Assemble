import { STATUS_CONFIG } from '../adminWithdrawals.helpers';

const WithdrawalStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 8, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
      <Icon style={{ fontSize: '0.75rem' }} /> {cfg.label}
    </span>
  );
};

export default WithdrawalStatusBadge;