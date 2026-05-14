import { BANKS } from '../showroomWithdrawals.helpers';

const BankAvatar = ({ bank, size = 32 }) => {
  const meta = BANKS.find((b) => b.code === bank || b.name === bank || b.full === bank);
  const bg = meta?.color || '#6b7280';
  const text = (meta?.code || (bank || '?').slice(0, 3)).toUpperCase();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 8, background: bg, color: '#fff', fontWeight: 900, fontSize: `${Math.max(9, size * 0.28)}px`, letterSpacing: '0.04em', flexShrink: 0 }}>
      {text}
    </span>
  );
};

export default BankAvatar;