import { useCallback, useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import bookingService from '../../services/bookingService';
import reviewService from '../../services/reviewService';
import { resolveReviewBookingId } from '../../utils/bookingReviewEligibility';
import { mapRenterBooking } from '../../utils/renterBookingView';

const DISMISS_PREFIX = 'smartrent-renter-review-banner-dismiss:';
const REVIEWED_PREFIX = 'smartrent-renter-review-banner-reviewed:';
/** Tự kiểm tra booking (polling) mỗi 2 phút — không cần 10s để tránh gọi API dày. */
const POLL_INTERVAL_MS = 2 * 60 * 1000;

const dismissKey = (bookingId) => `${DISMISS_PREFIX}${bookingId}`;
const reviewedKey = (bookingId) => `${REVIEWED_PREFIX}${bookingId}`;

const readDismissed = (bookingId) => {
  try {
    return window.localStorage?.getItem(dismissKey(bookingId)) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = (bookingId) => {
  try {
    window.localStorage?.setItem(dismissKey(bookingId), '1');
  } catch {
    // ignore
  }
};

const readReviewed = (bookingId) => {
  try {
    return window.localStorage?.getItem(reviewedKey(bookingId)) === '1';
  } catch {
    return false;
  }
};

const writeReviewed = (bookingId) => {
  try {
    window.localStorage?.setItem(reviewedKey(bookingId), '1');
  } catch {
    // ignore
  }
};

const sortByEndDesc = (a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime();

/**
 * Fixed bottom-right popup for renter: completed trip review (stars + comment).
 */
const RenterPostTripReviewBanner = () => {
  const [refreshTick, setRefreshTick] = useState(0);
  const [resolving, setResolving] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [reviewEditingId, setReviewEditingId] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const bumpRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let mounted = true;
    const quiet = refreshTick > 0;

    const pickCandidate = async () => {
      if (!quiet) {
        setResolving(true);
      }
      try {
        const rawList = await bookingService.getCurrentRoleBookingsDetailed();
        if (!mounted) return;

        const reviewable = (rawList || [])
          .map((b) => mapRenterBooking(b))
          .filter((row) => row.canReviewVehicle && row.vehicleId && row.status === 'completed')
          .sort(sortByEndDesc);

        const vehicleReviewsCache = new Map();
        let next = null;

        for (const row of reviewable) {
          const { vehicleId } = row;
          if (readDismissed(row.id) || readReviewed(row.id)) continue;

          let reviews = vehicleReviewsCache.get(vehicleId);
          if (!reviews) {
            try {
              reviews = await reviewService.getMineByVehicleId(vehicleId);
            } catch {
              reviews = [];
            }
            vehicleReviewsCache.set(vehicleId, reviews);
          }
          if (!mounted) return;

          const already = (reviews || []).some(
            (r) => String(resolveReviewBookingId(r)) === String(row.id),
          );
          if (already) {
            writeReviewed(row.id);
            continue;
          }
          next = { row, vehicleId };
          break;
        }

        if (!mounted) return;
        setCandidate(next);
      } catch {
        if (mounted) setCandidate(null);
      } finally {
        if (mounted) setResolving(false);
      }
    };

    pickCandidate();
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!candidate?.row?.id || !candidate?.vehicleId) {
      setReviewEditingId('');
      setReviewForm({ rating: 5, comment: '' });
      setReviewLoading(false);
      setError('');
      return;
    }

    let mounted = true;
    const { row, vehicleId } = candidate;
    (async () => {
      setReviewEditingId('');
      setReviewForm({ rating: 5, comment: '' });
      setError('');
      setReviewLoading(true);
      try {
        const myReviews = await reviewService.getMineByVehicleId(vehicleId);
        const existing = (myReviews || []).find(
          (r) => String(resolveReviewBookingId(r)) === String(row.id),
        );
        if (!mounted) return;
        if (existing) {
          setReviewEditingId(existing._id || '');
          setReviewForm({
            rating: Number(existing.rating) || 5,
            comment: existing.comment || '',
          });
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Không thể tải đánh giá.');
      } finally {
        if (mounted) setReviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [candidate]);

  useEffect(() => {
    const onFocus = () => bumpRefresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [bumpRefresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        bumpRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [bumpRefresh]);

  useEffect(() => {
    const id = window.setInterval(() => bumpRefresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [bumpRefresh]);

  const handleDismiss = () => {
    if (candidate?.row?.id) {
      writeDismissed(candidate.row.id);
    }
    setCandidate(null);
    bumpRefresh();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidate?.row?.id || !candidate?.vehicleId) return;
    setSubmitting(true);
    setError('');
    try {
      if (reviewEditingId) {
        await reviewService.update({
          review_id: reviewEditingId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
      } else {
        await reviewService.create({
          booking_id: candidate.row.id,
          vehicle_id: candidate.vehicleId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
      }
      writeReviewed(candidate.row.id);
      setCandidate(null);
      bumpRefresh();
    } catch (err) {
      setError(err.message || 'Không thể lưu đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  if (resolving || !candidate) {
    return null;
  }

  const { row } = candidate;

  return (
    <div
      className="pointer-events-none fixed z-[340]"
      style={{
        bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="pointer-events-auto flex max-h-[min(85vh,22rem)] w-[min(calc(100vw-1.5rem),18rem)] flex-col overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-white shadow-[0_12px_40px_rgba(15,23,42,0.18)] sm:w-[18.5rem] sm:max-h-[min(85vh,24rem)]"
        role="dialog"
        aria-modal="false"
        aria-label="Đánh giá chuyến đi vừa hoàn thành"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-amber-100 bg-amber-50/90 px-3.5 py-2.5">
          <p className="text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-amber-900/85">
            Chuyến đi đã hoàn thành
          </p>
          <button
            type="button"
            className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-amber-900/60 transition hover:bg-amber-100 hover:text-amber-900"
            onClick={handleDismiss}
            disabled={submitting}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3">
          <h2 className="text-[0.88rem] font-bold leading-snug text-gray-900">
            Cảm nhận với <span className="text-amber-900">{row.vehicleName}</span>?
          </h2>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-gray-600">
            Góp ý ngắn giúp cộng đồng chọn xe đáng tin hơn.
          </p>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5">
            {reviewLoading ? (
              <p className="text-[0.78rem] text-gray-500">Đang tải...</p>
            ) : (
              <>
                <div>
                  <div className="mb-1 text-[0.72rem] font-semibold text-gray-700">Đánh giá</div>
                  <div className="flex justify-between gap-0.5 px-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-0.5"
                        onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                        aria-label={`${star} sao`}
                      >
                        <FaStar
                          className="text-[1.35rem]"
                          style={{ color: star <= reviewForm.rating ? '#f59e0b' : '#d1d5db' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="renter-trip-review-comment"
                    className="mb-1 block text-[0.72rem] font-semibold text-gray-700"
                  >
                    Cảm nhận (tuỳ chọn)
                  </label>
                  <textarea
                    id="renter-trip-review-comment"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    rows={2}
                    placeholder="Vài dòng là đủ..."
                    className="box-border w-full resize-none rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[0.8rem] text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200/80"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[0.72rem] text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-0.5">
              <button
                type="submit"
                className="btn-primary w-full justify-center py-2 text-[0.82rem]"
                disabled={submitting || reviewLoading}
              >
                {submitting ? 'Đang gửi...' : reviewEditingId ? 'Cập nhật' : 'Gửi đánh giá'}
              </button>
              <button
                type="button"
                className="btn-outline w-full justify-center py-2 text-[0.82rem]"
                disabled={submitting}
                onClick={handleDismiss}
              >
                Để sau
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RenterPostTripReviewBanner;
