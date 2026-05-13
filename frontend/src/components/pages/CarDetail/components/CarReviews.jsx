import { FaStar } from 'react-icons/fa';

const StarRow = ({ rating }) => (
  <span className="flex items-center gap-1 text-[0.85rem]">
    {[1, 2, 3, 4, 5].map((index) => (
      <FaStar
        key={index}
        size={13}
        color={index <= Math.round(Number(rating || 0)) ? '#f59e0b' : '#e5e7eb'}
        aria-hidden="true"
      />
    ))}
  </span>
);

const CarReviews = ({ reviews, reviewsMeta, reviewsLoading, currentUserId }) => {
  const isOwnReview = (review) => {
    if (!currentUserId) return false;
    const reviewUser = review?.user;
    if (!reviewUser) return false;
    const reviewUserId = typeof reviewUser === 'string' ? reviewUser : reviewUser._id || reviewUser.id || '';
    return reviewUserId === currentUserId;
  };

  const formatReviewDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
        <span className="text-[0.9rem] font-bold text-gray-800">
          Đánh giá {reviewsMeta.total > 0 && <span className="tabular-nums">({reviewsMeta.total})</span>}
        </span>
      </div>

      {reviewsLoading && <p className="py-2 text-[0.82rem] text-gray-400">Đang tải đánh giá...</p>}

      {!reviewsLoading && reviews.length === 0 && (
        <p className="py-2 text-[0.82rem] text-gray-400">Chưa có đánh giá nào.</p>
      )}

      {reviews.map((review) => (
        <div key={review._id} className="border-b border-gray-100 py-3 last:border-0">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.75rem] font-bold text-white">
                {(review.user?.name || 'U')[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.85rem] font-semibold text-gray-800">
                    {review.user?.name || 'Ẩn danh'}
                  </span>
                  {isOwnReview(review) && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
                      Đánh giá của bạn
                    </span>
                  )}
                  <StarRow rating={review.rating} />
                </div>
                {review.createdAt && (
                  <div className="mt-1 text-[0.72rem] text-gray-400">
                    {formatReviewDate(review.createdAt)}
                    {review.updatedAt && review.updatedAt !== review.createdAt ? ' · Đã chỉnh sửa' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="ml-9">
            {review.comment ? (
              <p className="text-[0.82rem] text-gray-600">{review.comment}</p>
            ) : (
              <p className="text-[0.8rem] italic text-gray-400">Người dùng chưa để lại nhận xét chi tiết.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CarReviews;
