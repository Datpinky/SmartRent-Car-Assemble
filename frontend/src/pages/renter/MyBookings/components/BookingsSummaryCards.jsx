const BookingsSummaryCards = ({ summary }) => {
  const cards = [
    { label: 'Đang thuê', value: summary.active, color: '#2563eb' },
    { label: 'Cần trả xe', value: summary.dueReturn, color: '#d97706' },
    { label: 'Chờ showroom xác nhận', value: summary.waitingReturnConfirmation, color: '#7c3aed' },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {cards.map((item) => (
        <div
          key={item.label}
          style={{
            background: '#fff',
            borderRadius: 10,
            padding: '10px 18px',
            border: '1px solid #f0f0f0',
            textAlign: 'center',
            minWidth: 150,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: item.color }}>{item.value}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default BookingsSummaryCards;
