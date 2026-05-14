import { useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaSearch } from 'react-icons/fa';
import BankAvatar from './BankAvatar';
import { BANKS } from '../showroomWithdrawals.helpers';

const BankPicker = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = BANKS.filter((b) =>
    !search.trim() || b.code.toLowerCase().includes(search.toLowerCase()) || b.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = BANKS.find((b) => b.code === value || b.name === value);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem', color: '#111827', textAlign: 'left' }}>
        {selected ? (<><BankAvatar bank={selected.code} size={28} /><span style={{ flex: 1, fontWeight: 700 }}>{selected.name}</span></>) : <span style={{ flex: 1, color: '#9ca3af' }}>Chọn ngân hàng...</span>}
        <FaChevronDown size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 999, top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', maxHeight: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaSearch size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm ngân hàng..." aria-label="Tìm ngân hàng"
              style={{ border: 'none', outline: 'none', fontSize: '0.85rem', background: 'transparent', width: '100%', color: '#374151' }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map((b) => (
              <button type="button" key={b.code}
                onClick={() => { onChange(b.name); setOpen(false); setSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: value === b.code || value === b.name ? '#f0fdf4' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f9fafb' }}>
                <BankAvatar bank={b.code} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{b.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.full}</div>
                </div>
                {(value === b.code || value === b.name) && <span style={{ color: '#00b14f', fontSize: '0.8rem', fontWeight: 700 }}>✓</span>}
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.84rem', color: '#9ca3af' }}>Không tìm thấy ngân hàng</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankPicker;