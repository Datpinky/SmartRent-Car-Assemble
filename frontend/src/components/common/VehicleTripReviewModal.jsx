import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import Modal from './Modal';
import reviewService from '../../services/reviewService';
import { resolveReviewBookingId } from '../../utils/bookingReviewEligibility';

const INITIAL_FORM = { rating: 5, comment: '' };

const VehicleTripReviewModal = ({
  isOpen,
  onClose,
  bookingId,
  vehicleId,
  vehicleName,
  onSuccess,
}) => {
  const [reviewEditingId, setReviewEditingId] = useState('');
  const [reviewForm, setReviewForm] = useState(INITIAL_FORM);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!isOpen || !vehicleId || !bookingId) {
      return;
    }

    let mounted = true;
    (async () => {
      setReviewEditingId('');
      setReviewForm(INITIAL_FORM);
      setReviewError('');
      setReviewLoading(true);
      try {
        const myReviews = await reviewService.getMineByVehicleId(vehicleId);
        const existing = (myReviews || []).find((r) => String(resolveReviewBookingId(r)) === String(bookingId));
        if (!mounted) return;
        if (existing) {
          setReviewEditingId(existing._id || '');
          setReviewForm({ rating: Number(existing.rating) || 5, comment: existing.comment || '' });
        }
      } catch (err) {
        if (!mounted) return;
        setReviewError(err.message || 'Không thể tải dữ liệu đánh giá.');
      } finally {
        if (mounted) setReviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, vehicleId, bookingId]);

  const handleClose = () => {
    setReviewEditingId('');
    setReviewForm(INITIAL_FORM);
    setReviewLoading(false);
    setReviewSubmitting(false);
    setReviewError('');
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!vehicleId || !bookingId) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      if (reviewEditingId) {
        await reviewService.update({
          review_id: reviewEditingId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
        onSuccess?.({ message: 'Đã cập nhật đánh giá.', mode: 'update' });
      } else {
        await reviewService.create({
          booking_id: bookingId,
          vehicle_id: vehicleId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
        onSuccess?.({ message: 'Đã gửi đánh giá.', mode: 'create' });
      }
      handleClose();
    } catch (err) {
      setReviewError(err.message || 'Không thể lưu đánh giá.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Đánh giá chuyến đi" width={520}>
      {isOpen && bookingId && vehicleId && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.96rem' }}>{vehicleName}</div>
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#64748b' }}>Booking: {bookingId}</div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#334155', lineHeight: 1.6 }}>
              Mỗi booking chỉ được gửi 1 đánh giá.
            </div>
          </div>
          {reviewLoading ? (
            <div style={{ padding: '12px 0', color: '#6b7280', fontSize: '0.84rem' }}>
              Đang tải dữ liệu đánh giá hiện tại...
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Đánh giá
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}>
                      <FaStar
                        style={{ color: star <= reviewForm.rating ? '#f59e0b' : '#d1d5db', fontSize: '1.4rem' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Nhận xét
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  placeholder="Chia sẻ trải nghiệm thuê xe của bạn..."
                  style={{
                    width: '100%',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {reviewError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: '#b91c1c',
                  }}
                >
                  {reviewError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-primary" disabled={reviewSubmitting} style={{ flex: 1 }}>
                  {reviewSubmitting ? 'Đang lưu...' : reviewEditingId ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                </button>
                <button type="button" className="btn-outline" onClick={handleClose} disabled={reviewSubmitting}>
                  Hủy
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
};

export default VehicleTripReviewModal;
