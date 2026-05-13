import { useCallback, useEffect, useState } from 'react';
import { FaEdit, FaPlus, FaRoute, FaSpinner, FaStar, FaTrash } from 'react-icons/fa';
import { MdDirectionsCar, MdEventSeat, MdLocalGasStation } from 'react-icons/md';
import { toast } from 'react-toastify';
import DataTable from '../../../components/common/DataTable';
import FileUpload from '../../../components/common/FileUpload';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../services/vehicleService';
import { formatVndPerDay } from '../../../utils/currencyFormat';

const FUEL_OPTS = ['Xăng', 'Dầu', 'Điện', 'Hybrid'];
const CAT_OPTS = ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Bán tải'];

const initForm = {
  name: '',
  plate: '',
  brand: '',
  category: 'SUV',
  price: '',
  seats: 5,
  fuel: 'Xăng',
  transmission: 'Số tự động',
  engine_number: '',
  vin: '',
  images: [],
};

const VehicleManagement = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initForm);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const filters = user?._id ? { added_by: user._id } : {};
      const { data } = await vehicleService.getList(filters);
      setVehicles(data);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách xe.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const openAdd = () => {
    setForm(initForm);
    setEditId(null);
    setModal('form');
  };
  const openEdit = (v) => {
    setForm({
      name: v.name || '',
      plate: v.plateNumber || '',
      brand: v.brand || '',
      category: v.type || 'SUV',
      price: v.price || '',
      seats: v.seats || 5,
      fuel: v.fuel || 'Xăng',
      transmission: v.transmission || 'Số tự động',
      engine_number: v.engineNumber || v.vehicle_engine_number || '',
      vin: v.vehicleIdentificationNumber || v.vehicle_identification_number || '',
      images: v.images || [],
    });
    setEditId(v._id || v.id);
    setModal('form');
  };
  const closeModal = () => {
    setModal(null);
    setForm(initForm);
    setEditId(null);
  };

  const handleSave = async () => {
    try {
      const payload = {
        vehicle_name: form.name,
        vehicle_plate_number: form.plate,
        vehicle_brand: form.brand,
        vehicle_model: form.name,
        vehicle_type: form.category,
        vehicle_hire_rate_in_figures: Number(form.price),
        vehicle_hire_rate_currency: 'VND',
        vehicle_hire_charge_per_timing: 'day',
        number_of_seats: Number(form.seats),
        fuel_type: { Xăng: 'petrol', Dầu: 'diesel', Điện: 'electric', Hybrid: 'hybrid' }[form.fuel] || 'petrol',
        transmission: form.transmission === 'Số sàn' ? 'manual' : 'automatic',
        vehicle_engine_number: form.engine_number,
        vehicle_identification_number: form.vin,
        vehicle_images_paths: form.images,
        company_owned: true,
      };
      if (editId) {
        const updated = await vehicleService.update(editId, payload);
        setVehicles((prev) => prev.map((v) => ((v._id || v.id) === editId ? updated : v)));
      } else {
        const created = await vehicleService.create(payload);
        setVehicles((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleDelete = (id) => setConfirmDeleteId(id);

  const doDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await vehicleService.deleteById(id);
      setVehicles((prev) => prev.filter((v) => (v._id || v.id) !== id));
      toast.success('Đã xóa xe thành công');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const filtered = vehicles.filter((v) => {
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'Thông tin xe',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {row.image ? (
              <img
                src={row.image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                aria-hidden="true"
              />
            ) : (
              <MdDirectionsCar size={22} color="#00b14f" aria-hidden="true" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#111827' }}>{row.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>BKS: {row.plateNumber || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Phân loại',
      render: (row) => (
        <div style={{ fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 600, color: '#374151' }}>{row.category}</div>
          <div style={{ color: '#9ca3af', display: 'flex', gap: 6, marginTop: 2 }}>
            <span>
              <MdEventSeat size={12} /> {row.seats}
            </span>
            <span>
              <MdLocalGasStation size={12} /> {row.fuel}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Giá/ngày',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#00b14f', fontSize: '0.9rem' }}>{formatVndPerDay(row.price)}</span>
      ),
      sortable: true,
      accessor: 'price',
    },
    {
      key: 'trips',
      label: 'Chuyến',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <FaRoute size={12} color="#9ca3af" />
          <span style={{ fontWeight: 600 }}>{row.trips}</span>
        </div>
      ),
      sortable: true,
      accessor: 'trips',
      align: 'center',
    },
    {
      key: 'rating',
      label: 'Đánh giá',
      render: (row) =>
        row.rating > 0 ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#d97706',
            }}
          >
            <FaStar size={12} /> {row.rating}
          </span>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
        ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => openEdit(row)}
            title="Chỉnh sửa"
            aria-label="Chỉnh sửa xe"
          >
            <FaEdit aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-icon danger"
            onClick={() => handleDelete(row._id || row.id)}
            title="Xóa xe"
            aria-label="Xóa xe"
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Quản lý xe</h1>
          <p className="page-subtitle">
            Quản lý toàn bộ xe trong showroom
            {vehicles.length > 0 ? ` (${vehicles.length} xe)` : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <FaPlus /> Thêm xe mới
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', marginRight: 4 }}>Trạng thái:</span>
          {['all', 'available', 'active', 'maintenance'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '4px 12px',
                borderRadius: 50,
                border: '1.5px solid',
                borderColor: filterStatus === s ? '#00b14f' : '#e5e7eb',
                background: filterStatus === s ? '#00b14f' : '#fff',
                color: filterStatus === s ? '#fff' : '#374151',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'Tất cả' : s === 'available' ? 'Sẵn sàng' : s === 'active' ? 'Đang thuê' : 'Bảo dưỡng'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <FaSpinner aria-hidden="true" className="animate-spin text-primary text-xl" />
          <span>Đang tải dữ liệu…</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
          {loadError}
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} searchPlaceholder="Tìm theo tên xe, biển số..." />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modal === 'form'}
        onClose={closeModal}
        title={editId ? 'Chỉnh sửa xe' : 'Thêm xe mới'}
        width={580}
        footer={
          <>
            <button className="btn-outline" onClick={closeModal}>
              Hủy
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Lưu xe
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['Tên xe', 'name', 'text'],
            ['Biển số', 'plate', 'text'],
            ['Thương hiệu', 'brand', 'text'],
            ['Số chỗ ngồi', 'seats', 'number'],
            ['Giá thuê (VNĐ/ngày)', 'price', 'number'],
            ['Số máy', 'engine_number', 'text'],
            ['Số khung (VIN)', 'vin', 'text'],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 9,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          {[
            ['Phân loại', 'category', CAT_OPTS],
            ['Nhiên liệu', 'fuel', FUEL_OPTS],
            ['Hộp số', 'transmission', ['Số tự động', 'Số sàn']],
          ].map(([label, key, opts]) => (
            <div key={key}>
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {label}
              </label>
              <select
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 9,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <FileUpload
            label="Hình ảnh xe"
            multiple
            hint="JPG, PNG – tối đa 5MB mỗi ảnh"
            onUpload={(urls) => setForm((f) => ({ ...f, images: urls }))}
          />
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Xác nhận xóa xe"
        width={420}
        footer={
          <>
            <button className="btn-outline" onClick={() => setConfirmDeleteId(null)}>
              Hủy
            </button>
            <button
              className="btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={doDelete}
            >
              Xóa xe
            </button>
          </>
        }
      >
        <p style={{ color: '#374151', fontSize: '0.9rem', margin: 0 }}>
          Bạn có chắc muốn xóa xe này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

export default VehicleManagement;
