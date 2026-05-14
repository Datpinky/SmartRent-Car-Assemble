import { Fragment } from 'react';
import { FILTER_TABS } from '../bookingManagement.helpers';

const StatusPipeline = ({ countsByStatus }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      border: '1px solid #f0f0f0',
      overflowX: 'auto',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 820 }}>
      {FILTER_TABS.map((tab, index) => {
        const count = tab.statuses.reduce((sum, s) => sum + (countsByStatus[s] || 0), 0);
        return (
          <Fragment key={tab.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: count ? '#00b14f' : '#e5e7eb' }} />
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
              <span className="tabular-nums" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#111827' }}>
                {count}
              </span>
            </div>
            {index < FILTER_TABS.length - 1 && <div style={{ height: 1, background: '#e5e7eb', flex: 1.4 }} />}
          </Fragment>
        );
      })}
    </div>
  </div>
);

export default StatusPipeline;
