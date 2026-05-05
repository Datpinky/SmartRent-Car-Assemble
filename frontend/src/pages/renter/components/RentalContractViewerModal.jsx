import React, { useCallback, useEffect, useState } from 'react';
import { FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import Modal from '../../../components/common/Modal';
import { RENTAL_CONTRACT_UI } from '../../../constants/rentalContractTemplate';
import { getRentalContractByBookingId } from '../../../services/rentalContractService';
import { formatDateTime, formatMoney } from '../../../utils/renterBookingView';

function SectionTitle({ children }) {
  return <h4 className="text-sm font-extrabold text-gray-900 mt-4 mb-2 border-b border-gray-200 pb-1">{children}</h4>;
}

function BulletList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="list-disc pl-5 text-[0.78rem] text-gray-600 space-y-1 leading-relaxed">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function PartyBlock({ title, contact }) {
  if (!contact && !title) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-slate-50/90 p-3 text-[0.78rem]">
      <p className="font-bold text-gray-900 mb-2">{title}</p>
      {contact?.name && <p><span className="text-gray-500">Tên:</span> {contact.name}</p>}
      {contact?.email && <p><span className="text-gray-500">Email:</span> {contact.email}</p>}
      {contact?.phone && <p><span className="text-gray-500">Điện thoại:</span> {contact.phone}</p>}
      {contact?.address && <p><span className="text-gray-500">Địa chỉ:</span> {contact.address}</p>}
      {contact?.identityDocument && (
        <p className="mt-2 text-gray-500 text-[0.72rem]">
          Giấy tờ: {contact.identityDocument.documentType} {contact.identityDocument.idNumber}
          {contact.identityDocument.note ? ` — ${contact.identityDocument.note}` : ''}
        </p>
      )}
    </div>
  );
}

function renderContractBody(data) {
  if (!data) return null;

  const v = data.article1_vehicleAndAgreement?.vehicle;

  return (
    <div className="space-y-1 text-[0.8rem] text-gray-700 leading-relaxed pb-2">
      {data.header && (
        <div className="text-center space-y-1 mb-4">
          <p className="text-[0.72rem] font-semibold">{data.header.stateMotto}</p>
          <p className="text-[0.72rem] text-gray-500">{data.header.independence}</p>
          <p className="text-base font-extrabold text-gray-900 mt-2">{data.header.title}</p>
          {Array.isArray(data.header.legalBasis) && (
            <ul className="list-none text-[0.72rem] text-gray-600 mt-2 space-y-0.5">
              {data.header.legalBasis.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data.contractMeta && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-[0.78rem] mb-3">
          <p><span className="text-gray-500">Số hợp đồng (hệ thống):</span> {data.contractMeta.contractNumber}</p>
          {data.contractMeta.preamble && (
            <p className="mt-2 text-gray-600 whitespace-pre-wrap">{data.contractMeta.preamble}</p>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <PartyBlock title={data.partyA?.label} contact={data.partyA?.showroom} />
        <PartyBlock title={data.partyB?.label} contact={data.partyB?.renter} />
      </div>

      {data.article1_vehicleAndAgreement && (
        <>
          <SectionTitle>{data.article1_vehicleAndAgreement.title}</SectionTitle>
          {v && (
            <div className="text-[0.78rem] space-y-1">
              <p>Nhãn hiệu / dòng xe: {[v.brand, v.model].filter(Boolean).join(' ')}</p>
              {v.plateNumber && <p>Biển số: {v.plateNumber}</p>}
              {v.numberOfSeats != null && <p>Số chỗ: {v.numberOfSeats}</p>}
              {v.engineNumber && <p>Số máy: {v.engineNumber}</p>}
              {v.vin && <p>Số khung: {v.vin}</p>}
              {Array.isArray(v.lessorWarranties) && v.lessorWarranties.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-gray-800">Cam kết (Bên A)</p>
                  <BulletList items={v.lessorWarranties} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {data.article2_rentalPeriod && (
        <>
          <SectionTitle>{data.article2_rentalPeriod.title}</SectionTitle>
          <p>Nhận xe: {formatDateTime(data.article2_rentalPeriod.startDate)}</p>
          <p>Trả xe: {formatDateTime(data.article2_rentalPeriod.endDate)}</p>
          {data.article2_rentalPeriod.duration && <p>Thời hạn: {data.article2_rentalPeriod.duration}</p>}
        </>
      )}

      {data.article3_purpose && (
        <>
          <SectionTitle>{data.article3_purpose.title}</SectionTitle>
          <p>{data.article3_purpose.defaultPurpose}</p>
          {data.article3_purpose.purposeFromNote && (
            <p className="text-gray-600 mt-1">Ghi chú đơn: {data.article3_purpose.purposeFromNote}</p>
          )}
        </>
      )}

      {data.article4_priceAndPayment && (
        <>
          <SectionTitle>{data.article4_priceAndPayment.title}</SectionTitle>
          <p>
            Giá thuê (số): {formatMoney(data.article4_priceAndPayment.rentPriceFigures)}
            {data.article4_priceAndPayment.rentPricePer
              ? ` / ${data.article4_priceAndPayment.rentPricePer}`
              : ''}
          </p>
          <p>Phương thức thanh toán: {data.article4_priceAndPayment.paymentMethod || '—'}</p>
          {data.article4_priceAndPayment.paymentDueNote && (
            <p className="text-gray-600">{data.article4_priceAndPayment.paymentDueNote}</p>
          )}
          {data.article4_priceAndPayment.clauseCashHandling && (
            <p className="text-[0.74rem] text-gray-500 mt-1">{data.article4_priceAndPayment.clauseCashHandling}</p>
          )}
        </>
      )}

      {data.article5_deliveryAndReturn && (
        <>
          <SectionTitle>{data.article5_deliveryAndReturn.title}</SectionTitle>
          <p>{data.article5_deliveryAndReturn.text}</p>
        </>
      )}

      {data.article6_lessorRightsObligations && (
        <>
          <SectionTitle>{data.article6_lessorRightsObligations.title}</SectionTitle>
          <p className="font-semibold text-gray-800 text-[0.76rem]">Nghĩa vụ Bên A</p>
          <BulletList items={data.article6_lessorRightsObligations.obligations} />
          <p className="font-semibold text-gray-800 text-[0.76rem] mt-2">Quyền Bên A</p>
          <BulletList items={data.article6_lessorRightsObligations.rights} />
        </>
      )}

      {data.article7_renterRightsObligations && (
        <>
          <SectionTitle>{data.article7_renterRightsObligations.title}</SectionTitle>
          <p className="font-semibold text-gray-800 text-[0.76rem]">Nghĩa vụ Bên B</p>
          <BulletList items={data.article7_renterRightsObligations.obligations} />
          <p className="font-semibold text-gray-800 text-[0.76rem] mt-2">Quyền Bên B</p>
          <BulletList items={data.article7_renterRightsObligations.rights} />
        </>
      )}

      {data.article8_warranties && (
        <>
          <SectionTitle>{data.article8_warranties.title}</SectionTitle>
          <p className="font-semibold text-[0.76rem]">Bên A</p>
          <BulletList items={data.article8_warranties.partyA} />
          <p className="font-semibold text-[0.76rem] mt-2">Bên B</p>
          <BulletList items={data.article8_warranties.partyB} />
          <p className="font-semibold text-[0.76rem] mt-2">Hai bên</p>
          <BulletList items={data.article8_warranties.mutual} />
        </>
      )}

      {data.article9_finalProvisions && (
        <>
          <SectionTitle>{data.article9_finalProvisions.title}</SectionTitle>
          <BulletList items={data.article9_finalProvisions.clauses} />
        </>
      )}

      {data.signatures && (
        <>
          <SectionTitle>{data.signatures.title}</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            {Array.isArray(data.signatures.table) &&
              data.signatures.table.map((row) => (
                <div
                  key={row.party}
                  className="rounded-xl border border-dashed border-gray-300 p-4 min-h-[120px] flex flex-col"
                >
                  <p className="font-bold text-gray-900 text-[0.78rem]">{row.party}</p>
                  <p className="text-[0.72rem] text-gray-500 mt-1 flex-1">{row.instruction}</p>
                  <div className="mt-6 border-t border-gray-200 pt-2 text-[0.7rem] text-gray-400">Chữ ký / xác nhận</div>
                </div>
              ))}
          </div>
          {data.signatures.copiesNote && (
            <p className="text-[0.72rem] text-gray-500 mt-3">{data.signatures.copiesNote}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function RentalContractViewerModal({ isOpen, bookingId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const payload = await getRentalContractByBookingId(bookingId);
      setData(payload);
    } catch (err) {
      const msg =
        err?.response?.data?.message
        || err?.message
        || 'Không thể tải hợp đồng. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen && bookingId) {
      load();
    } else if (!isOpen) {
      setData(null);
      setError('');
    }
  }, [isOpen, bookingId, load]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={RENTAL_CONTRACT_UI.officialModalTitle} width={920}>
      <div className="min-h-[200px]">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
            <FaSpinner className="animate-spin text-2xl text-primary" aria-hidden />
            <span className="text-sm">Đang tải Hợp đồng chính thức...</span>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm"
          >
            <FaExclamationCircle className="shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && data && renderContractBody(data)}
      </div>
    </Modal>
  );
}
