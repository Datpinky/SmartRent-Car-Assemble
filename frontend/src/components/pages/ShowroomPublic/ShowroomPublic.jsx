import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaBriefcase, FaChevronLeft, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import CarGrid from '../../CarGrid/CarGrid';
import reviewService from '../../../services/reviewService';
import showroomService from '../../../services/showroomService';

const getShowroomName = (profile) => profile?.business_name || profile?.name || 'Showroom';

const getShowroomAddress = (profile) =>
  String(profile?.public_address || profile?.address || '').trim() || '';

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
  const showroomAddress = useMemo(() => getShowroomAddress(profile), [profile]);
  const showroomPhone = useMemo(() => String(profile?.phone || '').trim(), [profile]);
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
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-5">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={showroomName}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-gray-100 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white">
                  {getAvatarLabel(showroomName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-sky-700">
                    <FaBriefcase size={11} aria-hidden />
                    Hồ sơ showroom
                  </span>
                  <span className="text-[0.8rem] font-semibold text-gray-500">
                    {vehicleCount} xe công khai
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{showroomName}</h1>
                <p className="mt-3 flex items-start gap-2 text-[0.95rem] leading-relaxed text-gray-700">
                  <FaMapMarkerAlt className="mt-0.5 shrink-0 text-primary" aria-hidden />
                  <span>{showroomAddress || 'Chưa có địa chỉ công khai'}</span>
                </p>
                <p className="mt-2 flex items-center gap-2 text-[0.95rem] text-gray-700">
                  <FaPhone className="shrink-0 text-primary" size={14} aria-hidden />
                  {showroomPhone ? (
                    <a href={`tel:${showroomPhone.replace(/\s/g, '')}`} className="text-gray-800 no-underline hover:text-primary">
                      {showroomPhone}
                    </a>
                  ) : (
                    <span className="text-gray-500">Chưa cập nhật số điện thoại</span>
                  )}
                </p>
              </div>
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
