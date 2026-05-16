import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaChevronLeft, FaClock, FaMapMarkerAlt, FaPhone, FaStore } from 'react-icons/fa';
import CarGrid from '../../CarGrid/CarGrid';
import reviewService from '../../../services/reviewService';
import showroomService from '../../../services/showroomService';

const getShowroomName = (profile) => profile?.business_name || profile?.name || 'Showroom';

const getAvatarLabel = (value) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) {
    return 'SR';
  }
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const InfoChip = ({ icon, label, value }) => {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <div className="text-[0.72rem] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className="mt-0.5 text-[0.9rem] text-gray-800">{value}</div>
      </div>
    </div>
  );
};

const ShowroomPublic = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadShowroom = async () => {
      setLoading(true);
      try {
        const [profileData, vehiclePayload] = await Promise.all([
          showroomService.getPublicProfile(userId),
          showroomService.getPublicVehicles(userId, { limit: 24 }),
        ]);

        const vehiclesWithSummary = await reviewService.enrichVehiclesWithSummary(vehiclePayload.data || [], { limit: 100 });
        if (cancelled) {
          return;
        }

        setProfile(profileData);
        setVehicles(vehiclesWithSummary);
        setPagination(vehiclePayload.pagination || { total: vehiclesWithSummary.length, page: 1, limit: 24, totalPages: 1 });
        setError('');
      } catch (err) {
        if (cancelled) {
          return;
        }

        setProfile(null);
        setVehicles([]);
        setPagination({ total: 0, page: 1, limit: 12, totalPages: 0 });
        setError(err.message || 'Không thể tải thông tin');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadShowroom();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const showroomName = useMemo(() => getShowroomName(profile), [profile]);
  const vehicleCount = pagination.total || vehicles.length;

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-6">
      <button
        type="button"
        className="mb-5 inline-flex items-center gap-2 text-[0.82rem] font-medium text-gray-500 transition-colors hover:text-primary"
        onClick={() => navigate(-1)}
      >
        <FaChevronLeft size={12} aria-hidden="true" /> Quay lai
      </button>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[0.88rem] text-red-700">
          <div className="font-semibold">Không thể tải hồ sơ showroom.</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-sky-50 to-emerald-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-5">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={showroomName}
                  className="h-20 w-20 rounded-2xl border border-white/70 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow-sm">
                  {getAvatarLabel(showroomName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[0.76rem] font-semibold text-primary shadow-sm">
                    <FaStore size={11} aria-hidden="true" /> Hồ sơ showroom
                  </span>
                  <span className="text-[0.78rem] font-medium text-gray-500">{vehicleCount} xe công khai</span>
                </div>
                <h1 className="mt-3 text-3xl font-extrabold text-gray-900">{showroomName}</h1>
                {profile?.showroom_representative_name && (
                  <p className="mt-2 text-[0.95rem] text-gray-600">Người đại diện: {profile.showroom_representative_name}</p>
                )}
                {profile?.showroom_description && (
                  <p className="mt-3 max-w-[900px] text-[0.92rem] leading-7 text-gray-600">{profile.showroom_description}</p>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <InfoChip icon={<FaMapMarkerAlt size={14} />} label="Địa chỉ" value={profile?.public_address} />
              <InfoChip icon={<FaClock size={14} />} label="Giờ mở cửa" value={profile?.opening_hours} />
              <InfoChip icon={<FaPhone size={14} />} label="Liên hệ" value={profile?.phone} />
            </div>

            {profile?.policy_text && (
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <div className="text-[0.76rem] font-semibold uppercase tracking-wide text-gray-400">Chính sách của showroom</div>
                <div className="mt-2 text-[0.9rem] leading-7 text-gray-600">{profile.policy_text}</div>
              </div>
            )}
          </section>

          <section className="mt-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[1.2rem] font-extrabold text-gray-900">Xe đang cho thuê</div>
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[0.8rem] font-semibold text-gray-600 shadow-sm">
                {vehicleCount} xe
              </div>
            </div>

            <CarGrid cars={vehicles} loading={loading} />
          </section>
        </>
      )}
    </main>
  );
};

export default ShowroomPublic;
