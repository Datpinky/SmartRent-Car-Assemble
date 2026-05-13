/**
 * Shimmer skeleton that mimics the booking-card-item layout.
 *
 * Props:
 *   count  {number}  – how many skeleton cards to render (default 3)
 *   compact {boolean} – smaller variant for contract/narrow lists
 */
const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} aria-hidden="true" />
);

const BookingSkeletonCard = () => (
  <div className="booking-card-item" aria-hidden="true" style={{ pointerEvents: 'none', cursor: 'default' }}>
    {/* Left: image + info */}
    <div className="booking-card-left">
      <div className="booking-card-img" style={{ overflow: 'hidden', background: '#f3f4f6' }}>
        <SkeletonPulse className="w-full h-full rounded-xl" />
      </div>
      <div className="booking-card-info" style={{ flex: 1 }}>
        {/* Vehicle name */}
        <SkeletonPulse className="h-4 w-3/4 mb-2" />
        {/* Showroom name */}
        <SkeletonPulse className="h-3 w-1/2 mb-3" />
        {/* Date / time row */}
        <div className="flex gap-3 flex-wrap mb-2">
          <SkeletonPulse className="h-3 w-40" />
          <SkeletonPulse className="h-3 w-12" />
          <SkeletonPulse className="h-3 w-20" />
        </div>
        {/* Status headline */}
        <SkeletonPulse className="h-3 w-2/5 mt-1" />
      </div>
    </div>

    {/* Right: badges + price + buttons */}
    <div className="booking-card-right">
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <SkeletonPulse className="h-5 w-20 rounded-full" />
        <SkeletonPulse className="h-5 w-24 rounded-full" />
        <SkeletonPulse className="h-5 w-16 mt-1" />
        <SkeletonPulse className="h-3 w-28" />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
        <SkeletonPulse className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  </div>
);

const CompactSkeletonCard = () => (
  <div
    className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm"
    aria-hidden="true"
    style={{ pointerEvents: 'none' }}
  >
    <div className="flex justify-between items-start gap-4">
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonPulse className="h-3.5 w-28" />
        <SkeletonPulse className="h-4 w-48" />
        <SkeletonPulse className="h-3 w-64" />
        <SkeletonPulse className="h-3 w-20" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <SkeletonPulse className="h-6 w-16 rounded-full" />
        <SkeletonPulse className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

const SkeletonCard = ({ count = 3, compact = false }) => (
  <div aria-label="Đang tải dữ liệu..." role="status">
    {Array.from({ length: count }).map((_, i) =>
      compact ? (
        <div key={i} className="mb-3.5">
          <CompactSkeletonCard />
        </div>
      ) : (
        <BookingSkeletonCard key={i} />
      ),
    )}
  </div>
);

export default SkeletonCard;
