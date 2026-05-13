import { FaSearch } from 'react-icons/fa';

const BookingsSearchBar = ({ value, onChange }) => (
  <div
    style={{
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    <label
      htmlFor="my-bookings-search"
      style={{
        minWidth: 260,
        flex: '1 1 320px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        borderRadius: 14,
        padding: '0 14px',
        minHeight: 44,
      }}
    >
      <FaSearch style={{ color: '#9ca3af', flexShrink: 0 }} aria-hidden="true" />
      <input
        id="my-bookings-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm theo mã đặt xe, tên xe hoặc showroom"
        aria-label="Tìm kiếm chuyến đi"
        style={{
          border: 'none',
          outline: 'none',
          width: '100%',
          fontSize: '0.84rem',
          color: '#111827',
          background: 'transparent',
        }}
      />
    </label>
  </div>
);

export default BookingsSearchBar;
