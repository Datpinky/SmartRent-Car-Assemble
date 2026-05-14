import { formatDateTime, formatMoney } from '../../../utils/renterBookingView';
import { BulletList, PartyBlock, SectionTitle } from '../contractModal.helpers';

const ContractBody = ({ data }) => {
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
            <ul className="list-none text-[0.72rem] text-gray-600 mt-2 space-y-0.5">{data.header.legalBasis.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
        </div>
      )}
      {data.contractMeta && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-[0.78rem] mb-3">
          <p><span className="text-gray-500">Số hợp đồng (hệ thống):</span> {data.contractMeta.contractNumber}</p>
          {data.contractMeta.preamble && <p className="mt-2 text-gray-600 whitespace-pre-wrap">{data.contractMeta.preamble}</p>}
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
                <div className="mt-2"><p className="font-semibold text-gray-800">Cam kết (Bên A)</p><BulletList items={v.lessorWarranties} /></div>
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
          {data.article3_purpose.purposeFromNote && <p className="text-gray-600 mt-1">Ghi chú đơn: {data.article3_purpose.purposeFromNote}</p>}
        </>
      )}
      {data.article4_priceAndPayment && (
        <>
          <SectionTitle>{data.article4_priceAndPayment.title}</SectionTitle>
          <p>Giá thuê: {formatMoney(data.article4_priceAndPayment.rentPriceFigures)}{data.article4_priceAndPayment.rentPricePer ? ` / ${data.article4_priceAndPayment.rentPricePer}` : ''}</p>
          <p>Phương thức thanh toán: {data.article4_priceAndPayment.paymentMethod || '—'}</p>
          {data.article4_priceAndPayment.paymentDueNote && <p className="text-gray-600">{data.article4_priceAndPayment.paymentDueNote}</p>}
          {data.article4_priceAndPayment.clauseCashHandling && <p className="text-[0.74rem] text-gray-500 mt-1">{data.article4_priceAndPayment.clauseCashHandling}</p>}
        </>
      )}
      {data.article5_deliveryAndReturn && (<><SectionTitle>{data.article5_deliveryAndReturn.title}</SectionTitle><p>{data.article5_deliveryAndReturn.text}</p></>)}
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
          <p className="font-semibold text-[0.76rem]">Bên A</p><BulletList items={data.article8_warranties.partyA} />
          <p className="font-semibold text-[0.76rem] mt-2">Bên B</p><BulletList items={data.article8_warranties.partyB} />
          <p className="font-semibold text-[0.76rem] mt-2">Hai bên</p><BulletList items={data.article8_warranties.mutual} />
        </>
      )}
      {data.article9_finalProvisions && (<><SectionTitle>{data.article9_finalProvisions.title}</SectionTitle><BulletList items={data.article9_finalProvisions.clauses} /></>)}
    </div>
  );
};

export default ContractBody;