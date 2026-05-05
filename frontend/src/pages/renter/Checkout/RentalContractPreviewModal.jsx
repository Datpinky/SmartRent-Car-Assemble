import React from 'react';
import Modal from '../../../components/common/Modal';
import {
  RENTAL_CONTRACT_UI,
  RENTAL_CONTRACT_LEGAL_BASIS,
  RENTAL_CONTRACT_MAIN_CLAUSES,
} from '../../../constants/rentalContractTemplate';

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <span className="text-[0.72rem] font-semibold text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium break-words">{value || '—'}</span>
    </div>
  );
}

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   renter: { name?: string; email?: string; phone?: string; address?: string };
 *   showroom: { name?: string; email?: string; phone?: string; address?: string };
 *   vehicle: { name?: string; brand?: string; model?: string; plateNumber?: string; seats?: number; transmission?: string; fuel?: string };
 *   pickupLabel: string;
 *   returnLabel: string;
 *   days: number;
 *   totalLabel: string;
 *   pickupMethodLabel: string;
 *   hasAcceptedContract: boolean;
 *   onHasAcceptedContractChange: (value: boolean) => void;
 * }} props
 */
export default function RentalContractPreviewModal({
  isOpen,
  onClose,
  renter,
  showroom,
  vehicle,
  pickupLabel,
  returnLabel,
  days,
  totalLabel,
  pickupMethodLabel,
  hasAcceptedContract,
  onHasAcceptedContractChange,
}) {
  const handleConfirm = () => {
    if (!hasAcceptedContract) return;
    onClose();
  };

  const footer = (
    <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-start gap-3 cursor-pointer select-none min-w-0 flex-1">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
          checked={hasAcceptedContract}
          onChange={(e) => onHasAcceptedContractChange(e.target.checked)}
        />
        <span className="text-[0.82rem] text-gray-800 leading-relaxed">{RENTAL_CONTRACT_UI.acceptCheckbox}</span>
      </label>
      <button
        type="button"
        className="btn-primary shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!hasAcceptedContract}
        onClick={handleConfirm}
      >
        {RENTAL_CONTRACT_UI.confirmPreviewButton}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={RENTAL_CONTRACT_UI.previewModalTitle} width={640} footer={footer}>
      <div className="space-y-4 text-gray-800">
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.8rem] leading-relaxed text-amber-950"
        >
          {RENTAL_CONTRACT_UI.previewBanner}
        </div>

        <div className="text-center space-y-1 pt-1">
          <p className="text-[0.72rem] font-semibold tracking-wide text-gray-600">{RENTAL_CONTRACT_UI.stateMotto}</p>
          <p className="text-[0.72rem] text-gray-500">{RENTAL_CONTRACT_UI.independence}</p>
          <h4 className="text-base font-extrabold text-gray-900 mt-2">{RENTAL_CONTRACT_UI.documentTitle}</h4>
        </div>

        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Căn cứ pháp lý (trích yếu)</p>
          <ul className="list-disc pl-5 text-[0.8rem] text-gray-600 space-y-1">
            {RENTAL_CONTRACT_LEGAL_BASIS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-slate-50/80 p-4">
            <p className="text-xs font-bold text-gray-800 mb-2">Bên thuê (Renter)</p>
            <Field label="Họ tên" value={renter?.name} />
            <Field label="Email" value={renter?.email} />
            <Field label="Điện thoại" value={renter?.phone} />
            <Field label="Địa chỉ" value={renter?.address} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-slate-50/80 p-4">
            <p className="text-xs font-bold text-gray-800 mb-2">Bên cho thuê (Showroom)</p>
            <Field label="Tên / đơn vị" value={showroom?.name} />
            <Field label="Email" value={showroom?.email} />
            <Field label="Điện thoại" value={showroom?.phone} />
            <Field label="Địa chỉ" value={showroom?.address} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-800 mb-2">Thông tin xe</p>
          <Field label="Xe" value={vehicle?.name || [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ')} />
          <Field label="Biển số" value={vehicle?.plateNumber} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Số chỗ" value={vehicle?.seats != null ? String(vehicle.seats) : ''} />
            <Field label="Hộp số / nhiên liệu" value={[vehicle?.transmission, vehicle?.fuel].filter(Boolean).join(' · ')} />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary-light/30 p-4 space-y-2">
          <Field label="Ngày giờ nhận xe" value={pickupLabel} />
          <Field label="Ngày giờ trả xe" value={returnLabel} />
          <Field label="Số ngày thuê (ước tính)" value={`${days} ngày`} />
          <Field label="Hình thức nhận xe" value={pickupMethodLabel} />
          <div className="pt-2 flex justify-between items-baseline gap-3">
            <span className="text-sm font-bold text-gray-800">Tổng tiền (ước tính)</span>
            <span className="text-lg font-extrabold text-primary tabular-nums">{totalLabel}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-800 mb-2">Điều khoản chính (tóm tắt)</p>
          <div className="space-y-3 text-[0.78rem] text-gray-600 leading-relaxed">
            {RENTAL_CONTRACT_MAIN_CLAUSES.map((block) => (
              <div key={block.title}>
                <p className="font-bold text-gray-800 text-[0.8rem] mb-1">{block.title}</p>
                <ul className="list-disc pl-4 space-y-1">
                  {block.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
