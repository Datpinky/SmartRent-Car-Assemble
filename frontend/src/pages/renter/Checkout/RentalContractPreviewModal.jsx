import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import Modal from '../../../components/common/Modal';
import {
  RENTAL_CONTRACT_UI,
  RENTAL_CONTRACT_LEGAL_BASIS,
  RENTAL_CONTRACT_MAIN_CLAUSES,
} from '../../../constants/rentalContractTemplate';

function DocRow({ label, value }) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : '';
  const empty = !raw;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_1fr] gap-x-2 sm:gap-x-3 py-1.5 text-[0.8125rem] leading-snug border-b border-gray-100 last:border-b-0">
      <span className="text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className={`font-medium break-words ${empty ? 'text-gray-400 italic' : 'text-gray-900'}`}>
        {empty ? 'Chưa cung cấp' : raw}
      </span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gray-500 mb-2.5 mt-6 first:mt-0">
      {children}
    </h2>
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

  const vehicleTitle =
    vehicle?.name || [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ').trim() || '';

  const footer = (
    <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label className="flex items-start gap-3 cursor-pointer select-none min-w-0 flex-1">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
          checked={hasAcceptedContract}
          onChange={(e) => onHasAcceptedContractChange(e.target.checked)}
        />
        <span className="text-[0.82rem] text-gray-800 leading-snug">{RENTAL_CONTRACT_UI.acceptCheckbox}</span>
      </label>
      <button
        type="button"
        className="btn-primary shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        disabled={!hasAcceptedContract}
        onClick={handleConfirm}
      >
        {RENTAL_CONTRACT_UI.confirmPreviewButton}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={RENTAL_CONTRACT_UI.previewModalTitle} width={720} footer={footer}>
      <div className="text-gray-900">
        {/* Cảnh báo gọn */}
        <div
          role="status"
          className="mb-5 flex gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2.5 text-[0.78rem] leading-snug text-amber-950"
        >
          <FaInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="m-0">{RENTAL_CONTRACT_UI.previewBanner}</p>
        </div>

        {/* Khung “trang hợp đồng” */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-5 sm:px-7 sm:py-7 max-w-none">
            {/* Tiêu đề văn bản */}
            <header className="text-center border-b border-gray-800 pb-4 mb-1">
              <p className="text-[0.68rem] sm:text-[0.72rem] font-semibold tracking-[0.06em] text-gray-800 uppercase m-0">
                {RENTAL_CONTRACT_UI.stateMotto}
              </p>
              <p className="text-[0.68rem] text-gray-600 mt-1 m-0">{RENTAL_CONTRACT_UI.independence}</p>
              <h4 className="text-[0.98rem] sm:text-[1.06rem] font-extrabold text-gray-900 uppercase tracking-tight mt-4 mb-0 leading-tight">
                {RENTAL_CONTRACT_UI.documentTitle}
              </h4>
            </header>

            <SectionTitle>Căn cứ pháp lý (trích yếu)</SectionTitle>
            <ol className="m-0 pl-4 space-y-1 text-[0.8rem] text-gray-600 leading-relaxed list-decimal marker:text-gray-400">
              {RENTAL_CONTRACT_LEGAL_BASIS.map((line) => (
                <li key={line} className="pl-0.5">
                  {line}
                </li>
              ))}
            </ol>

            <SectionTitle>Các bên tham gia</SectionTitle>
            <div className="rounded-md border border-gray-200 overflow-hidden divide-y divide-gray-200 sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2 bg-gray-50/40">
              <div className="p-3 sm:p-4 bg-white">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-1">Bên thuê</p>
                <p className="text-[0.7rem] text-gray-500 mb-2">Renter</p>
                <DocRow label="Họ tên" value={renter?.name} />
                <DocRow label="Email" value={renter?.email} />
                <DocRow label="Điện thoại" value={renter?.phone} />
                <DocRow label="Địa chỉ" value={renter?.address} />
              </div>
              <div className="p-3 sm:p-4 bg-white">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-1">Bên cho thuê</p>
                <p className="text-[0.7rem] text-gray-500 mb-2">Showroom</p>
                <DocRow label="Tên / ĐV" value={showroom?.name} />
                <DocRow label="Email" value={showroom?.email} />
                <DocRow label="Điện thoại" value={showroom?.phone} />
                <DocRow label="Địa chỉ" value={showroom?.address} />
              </div>
            </div>

            <SectionTitle>Thông tin xe</SectionTitle>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-1 sm:px-4">
              <DocRow label="Xe" value={vehicleTitle} />
              <DocRow label="Biển số" value={vehicle?.plateNumber} />
              <DocRow label="Số chỗ" value={vehicle?.seats != null ? String(vehicle.seats) : ''} />
              <DocRow
                label="Hộp số / NL"
                value={[vehicle?.transmission, vehicle?.fuel].filter(Boolean).join(' · ')}
              />
            </div>

            <SectionTitle>Thời hạn & thanh toán (theo đơn này)</SectionTitle>
            <div className="rounded-md border border-gray-200 bg-gradient-to-b from-gray-50/90 to-white px-3 py-1 sm:px-4">
              <DocRow label="Ngày giờ nhận" value={pickupLabel} />
              <DocRow label="Ngày giờ trả" value={returnLabel} />
              <DocRow label="Số ngày thuê" value={`${days} ngày`} />
              <DocRow label="Hình thức" value={pickupMethodLabel} />
              <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_1fr] gap-x-2 sm:gap-x-3 py-2.5 text-[0.8125rem] border-t border-gray-200 mt-0.5">
                <span className="text-gray-700 font-semibold pt-0.5">Tổng tiền</span>
                <span className="text-base sm:text-lg font-extrabold text-primary tabular-nums tracking-tight">
                  {totalLabel}
                </span>
              </div>
            </div>

            <SectionTitle>Điều khoản chính (tóm tắt)</SectionTitle>
            <div className="space-y-3">
              {RENTAL_CONTRACT_MAIN_CLAUSES.map((block) => (
                <div key={block.title} className="pl-3 border-l-[3px] border-gray-200">
                  <p className="font-semibold text-[0.8rem] text-gray-900 m-0 leading-snug">{block.title}</p>
                  <ul className="mt-1.5 m-0 pl-0 space-y-1 text-[0.78rem] text-gray-600 leading-relaxed list-none">
                    {block.lines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-gray-300 shrink-0 mt-[0.15rem]">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
