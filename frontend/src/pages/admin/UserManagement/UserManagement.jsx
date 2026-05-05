import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import { FaEye, FaLock, FaUnlock, FaSpinner } from 'react-icons/fa';
import adminService from '../../../services/adminService';
import { useAuth } from '../../../contexts/AuthContext';

const ROLE_LABELS = { admin: 'Quản trị viên', showroom: 'Showroom', owner: 'Chủ xe', renter: 'Khách thuê' };
const ROLE_COLORS = { admin: '#6d28d9', showroom: '#00b14f', owner: '#0891b2', renter: '#d97706' };

const initialsFromName = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((w) => w[0]).slice(-2).join('').toUpperCase();
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await adminService.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || 'Không tải được danh sách người dùng.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openModal = (row, type) => {
    setSelectedUser(row);
    setModalType(type);
  };
  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
  };

  const isSelf = (row) =>
    String(row.id) === String(currentUser?.id) || String(row.id) === String(currentUser?._id);

  const toggleLock = async (row) => {
    if (isSelf(row)) return;
    const isLocking = row.status !== 'locked';
    if (isLocking && !window.confirm(`Bạn có chắc muốn khóa tài khoản "${row.name}"?`)) return;
    setActionError('');
    const nextActive = row.status === 'locked';
    setTogglingId(row.id);
    try {
      await adminService.setUserActive(row.id, nextActive);
      await loadUsers();
    } catch (e) {
      setActionError(e.message || 'Không cập nhật được trạng thái.');
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Người dùng',
      accessor: 'name',
      sortable: true,
      width: '28%',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, width: '100%' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: ROLE_COLORS[row.role] + '25',
              color: ROLE_COLORS[row.role],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {initialsFromName(row.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.83rem' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Vai trò',
      render: (row) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: ROLE_COLORS[row.role],
            background: ROLE_COLORS[row.role] + '15',
            padding: '3px 9px',
            borderRadius: 50,
          }}
        >
          {ROLE_LABELS[row.role]}
        </span>
      ),
    },
    { key: 'phone', label: 'Điện thoại', accessor: 'phone' },
    { key: 'bookings', label: 'Chuyến', accessor: 'bookings', sortable: true, align: 'center' },
    { key: 'status', label: 'Tài khoản', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: 'Ngày tạo', accessor: 'createdAt' },
    {
      key: 'actions',
      label: 'Hành động',
      render: (row) => {
        const self = isSelf(row);
        const busy = togglingId === row.id;
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn-icon" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => openModal(row, 'view')}>
              <FaEye />
            </button>
            <button
              type="button"
              className="btn-icon"
              title={self ? 'Không thể khóa chính bạn' : row.status === 'locked' ? 'Mở khóa' : 'Khóa'}
              aria-label={self ? 'Không thể khóa chính bạn' : row.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
              disabled={self || busy}
              onClick={() => toggleLock(row)}
              style={row.status === 'locked' ? { borderColor: '#059669', color: '#059669' } : {}}
            >
              {busy ? <FaSpinner className="animate-spin" /> : row.status === 'locked' ? <FaUnlock /> : <FaLock />}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Quản lý người dùng</h1>
          <p className="page-subtitle">Quản lý tất cả tài khoản trên nền tảng SmartRent Car</p>
        </div>
        <div />
      </div>

      {loadError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: 16,
          }}
        >
          {loadError}
        </div>
      )}
      {actionError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: 16,
          }}
        >
          {actionError}
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <div
              key={role}
              style={{
                background: '#fff',
                borderRadius: 10,
                padding: '10px 16px',
                border: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: ROLE_COLORS[role],
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{label}:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{loading ? '…' : count}</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div aria-live="polite" style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#6b7280' }}>
          <FaSpinner style={{ fontSize: '2rem', animation: 'spin 0.9s linear infinite' }} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Tìm theo tên, email…"
          searchFields={['name', 'email', 'phone']}
        />
      )}

      <Modal isOpen={modalType === 'view'} onClose={closeModal} title="Chi tiết người dùng" width={480}>
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: ROLE_COLORS[selectedUser.role] + '25',
                  color: ROLE_COLORS[selectedUser.role],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  flexShrink: 0,
                }}
              >
                {initialsFromName(selectedUser.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{selectedUser.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{selectedUser.email}</div>
              </div>
            </div>
            {[
              ['Vai trò', ROLE_LABELS[selectedUser.role]],
              ['Điện thoại', selectedUser.phone || '—'],
              ['Ngày tham gia', selectedUser.createdAt],
              ['Số chuyến / xe', selectedUser.bookings],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}
              >
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{k}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Trạng thái tài khoản</span>
              <StatusBadge status={selectedUser.status} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
