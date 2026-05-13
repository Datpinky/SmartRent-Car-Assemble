import { useCallback, useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaFilePdf, FaFileSignature, FaSpinner, FaTimes } from 'react-icons/fa';
import contractService from '../../services/contractService';
import { getRentalContractByBookingId } from '../../services/rentalContractService';
import { formatDateTime, formatMoney } from '../../utils/renterBookingView';
import SignaturePad from './SignaturePad';

/* ─── helpers ─────────────────────────────────────────────── */
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
      {contact?.name && (
        <p>
          <span className="text-gray-500">Tên:</span> {contact.name}
        </p>
      )}
      {contact?.email && (
        <p>
          <span className="text-gray-500">Email:</span> {contact.email}
        </p>
      )}
      {contact?.phone && (
        <p>
          <span className="text-gray-500">Điện thoại:</span> {contact.phone}
        </p>
      )}
      {contact?.address && (
        <p>
          <span className="text-gray-500">Địa chỉ:</span> {contact.address}
        </p>
      )}
      {contact?.identityDocument && (
        <p className="mt-2 text-gray-500 text-[0.72rem]">
          Giấy tờ: {contact.identityDocument.documentType} {contact.identityDocument.idNumber}
          {contact.identityDocument.note ? ` — ${contact.identityDocument.note}` : ''}
        </p>
      )}
    </div>
  );
}

/* ─── main body renderer ───────────────────────────────────── */
function ContractBody({ data }) {
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
          <p>
            <span className="text-gray-500">Số hợp đồng (hệ thống):</span> {data.contractMeta.contractNumber}
          </p>
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
            Giá thuê: {formatMoney(data.article4_priceAndPayment.rentPriceFigures)}
            {data.article4_priceAndPayment.rentPricePer ? ` / ${data.article4_priceAndPayment.rentPricePer}` : ''}
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
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

function SignedBadge({ name, signedAt, signatureImage }) {
  return (
    <div className="flex flex-col gap-2">
      {signatureImage && (
        <div className="bg-white border border-gray-200 rounded-lg p-2 inline-block">
          <img src={signatureImage} alt="Chữ ký" className="max-h-20 max-w-[200px] object-contain" />
        </div>
      )}
      <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <FaCheckCircle className="text-white text-sm" />
        </div>
        <div>
          {name && <p className="font-bold text-emerald-900 text-[0.8rem] leading-tight">{name}</p>}
          <p className="text-emerald-700 text-[0.72rem] mt-0.5">
            Đã xác nhận điện tử{signedAt ? ` — ${fmtDate(signedAt)}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── signature section ────────────────────────────────────── */
function SignatureSection({ contract, bodyData, onSigned }) {
  const [signature, setSignature] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(contract?.status === 'signed' || !!contract?.renter_signature);
  const [signedContract, setSignedContract] = useState(contract);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const padKey = useRef(0);

  const signaturesFromBody = bodyData?.signatures;

  // Bên A — merge bodyData table row with flat contract fields
  const partyARow = Array.isArray(signaturesFromBody?.table)
    ? signaturesFromBody.table.find((r) => !/bên\s*b/i.test(r.party))
    : null;
  const partyALabel = partyARow?.party || 'BÊN CHO THUÊ (Bên A)';
  const partyAInstruction = partyARow?.instruction || 'Ký và ghi rõ họ tên / đóng dấu (nếu có)';
  const partyAName = partyARow?.name || contract?.party_a_name || null;
  const partyASignedAt = partyARow?.signedAt || contract?.signed_at || null;
  // Prefer bodyData signatureImage, fall back to flat contract showroom_signature
  const partyAImage = partyARow?.signatureImage || contract?.showroom_signature || null;

  // Bên B
  const signerRow = Array.isArray(signaturesFromBody?.table)
    ? signaturesFromBody.table.find((r) => /bên\s*b/i.test(r.party))
    : null;

  const handleSign = async () => {
    if (!signature) {
      setSignError('Vui lòng vẽ chữ ký trước khi xác nhận.');
      return;
    }
    if (!contract?._id) {
      setSignError('Không tìm thấy ID hợp đồng để ký.');
      return;
    }
    setSignError('');
    setSigning(true);
    try {
      const updated = await contractService.signContract(contract._id, signature);
      setSignedContract(updated);
      setDone(true);
      if (onSigned) onSigned(updated);
    } catch (err) {
      setSignError(err?.response?.data?.message || 'Ký hợp đồng thất bại. Vui lòng thử lại.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-extrabold text-gray-900 mb-4">{signaturesFromBody?.title || 'Chữ ký các bên'}</h4>

      <div className="grid sm:grid-cols-2 gap-4 mb-3">
        {/* ── Bên A (read-only) ── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="font-extrabold text-gray-800 text-[0.82rem]">{partyALabel}</p>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">{partyAInstruction}</p>
          </div>
          <div className="border-t border-gray-200 pt-3 flex-1 flex flex-col justify-end">
            {partyAName ? (
              <SignedBadge name={partyAName} signedAt={partyASignedAt} signatureImage={partyAImage} />
            ) : (
              <div className="text-[0.72rem] text-gray-400 italic">Chưa có xác nhận từ showroom</div>
            )}
          </div>
        </div>

        {/* ── Bên B (interactive) ── */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="font-extrabold text-gray-800 text-[0.82rem]">{signerRow?.party || 'BÊN THUÊ (Bên B)'}</p>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">
              {done ? 'Đã ký xác nhận điện tử.' : signerRow?.instruction || 'Ký và ghi rõ họ tên'}
            </p>
          </div>
          <div className="border-t border-blue-100 pt-3 flex-1 flex flex-col justify-end">
            {done ? (
              <SignedBadge
                name={signedContract?.party_b_name || signerRow?.name || null}
                signedAt={signedContract?.renter_signed_at || signedContract?.signed_at || signerRow?.signedAt}
                signatureImage={signedContract?.renter_signature || signerRow?.signatureImage || null}
              />
            ) : (
              <div>
                <SignaturePad
                  key={padKey.current}
                  width={260}
                  height={110}
                  label="Vẽ chữ ký của bạn"
                  onSign={(s) => {
                    setSignature(s);
                    setConfirming(false);
                  }}
                  onClear={() => {
                    setSignature(null);
                    setConfirming(false);
                  }}
                />
                {signError && <p className="text-red-600 text-xs mt-2">{signError}</p>}

                {!confirming ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!signature) {
                        setSignError('Vui lòng vẽ chữ ký trước khi xác nhận.');
                        return;
                      }
                      setSignError('');
                      setConfirming(true);
                    }}
                    disabled={!signature}
                    className={`mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-blue-700 transition-colors ${
                      !signature ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <FaFileSignature /> Ký xác nhận hợp đồng
                  </button>
                ) : (
                  <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                    <p className="text-[0.8rem] font-bold text-amber-800 mb-1">⚠️ Xác nhận chữ ký</p>
                    <p className="text-[0.75rem] text-amber-700 mb-3 leading-snug">
                      Sau khi xác nhận, <strong>chữ ký không thể thay đổi</strong>. Hợp đồng có hiệu lực pháp lý ngay
                      sau đó.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSign}
                        disabled={signing}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 border-none rounded-lg text-white font-bold text-xs cursor-pointer hover:bg-blue-700 ${
                          signing ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {signing ? (
                          <>
                            <FaSpinner className="animate-spin" /> Đang ký...
                          </>
                        ) : (
                          <>✓ Xác nhận ký</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cảnh báo + nút PDF ── */}
      {!partyAImage && (
        <p className="text-[0.72rem] text-amber-600 mb-3 leading-snug">
          ⚠️ Showroom chưa cài chữ ký — PDF sẽ có ô trống Bên A. Yêu cầu showroom vào{' '}
          <strong>Hồ sơ → Chữ ký điện tử</strong> để thiết lập, sau đó nhấn <strong>Tạo lại PDF</strong>.
        </p>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {signedContract?.pdf_url && (
            <a
              href={signedContract.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-xs no-underline hover:bg-blue-700 transition-colors"
            >
              <FaFilePdf /> Tải hợp đồng PDF
            </a>
          )}
          {signedContract?._id && (
            <button
              type="button"
              disabled={regenerating}
              onClick={async () => {
                setRegenerating(true);
                setRegenError('');
                try {
                  const updated = await contractService.regeneratePdf(signedContract._id);
                  setSignedContract(updated);
                } catch (err) {
                  setRegenError(err?.response?.data?.message || 'Tạo lại PDF thất bại.');
                } finally {
                  setRegenerating(false);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer ${
                regenerating ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {regenerating ? (
                <>
                  <FaSpinner className="animate-spin" /> Đang tạo...
                </>
              ) : (
                <>↻ Tạo lại PDF</>
              )}
            </button>
          )}
          {regenError && <p className="text-red-600 text-xs">{regenError}</p>}
        </div>
      )}

      {signaturesFromBody?.copiesNote && (
        <p className="text-[0.72rem] text-gray-500 text-center italic">{signaturesFromBody.copiesNote}</p>
      )}
    </div>
  );
}

/* ─── main export ──────────────────────────────────────────── */
/**
 * ContractModal — hiển thị toàn bộ nội dung hợp đồng + chữ ký điện tử.
 *
 * Props:
 *  - isOpen: boolean
 *  - bookingId: string
 *  - onClose(): void
 *  - onSigned?(contract): void  — callback sau khi ký thành công
 */
export default function ContractModal({ isOpen, bookingId, onClose, onSigned }) {
  const [bodyData, setBodyData] = useState(null);
  const [signContract, setSignContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError('');
    setBodyData(null);
    setSignContract(null);

    try {
      const [body, sign] = await Promise.allSettled([
        getRentalContractByBookingId(bookingId),
        contractService.getByBookingId(bookingId),
      ]);

      if (body.status === 'fulfilled') setBodyData(body.value);
      if (sign.status === 'fulfilled') setSignContract(sign.value);

      if (body.status === 'rejected' && sign.status === 'rejected') {
        const msg =
          body.reason?.response?.data?.message || body.reason?.message || 'Không thể tải hợp đồng. Vui lòng thử lại.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen && bookingId) {
      load();
    } else if (!isOpen) {
      setBodyData(null);
      setSignContract(null);
      setError('');
    }
  }, [isOpen, bookingId, load]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 rounded-t-2xl px-6 py-5 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <FaFileSignature className="text-2xl shrink-0" />
            <div>
              <h2 className="font-extrabold text-base leading-tight">Hợp đồng thuê xe</h2>
              {signContract?.contract_number && (
                <p className="text-xs opacity-80 mt-0.5">Số HĐ: {signContract.contract_number}</p>
              )}
              {signContract?.status === 'signed' && (
                <span className="inline-flex items-center gap-1 mt-1 text-[0.7rem] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">
                  <FaCheckCircle /> Đã ký
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 border-none rounded-lg px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/30 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <FaSpinner className="animate-spin text-3xl text-blue-600" />
              <span className="text-sm">Đang tải hợp đồng...</span>
            </div>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="flex gap-3 items-start rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm"
            >
              <FaExclamationCircle className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {bodyData ? (
                <>
                  <ContractBody data={bodyData} />
                  <SignatureSection contract={signContract} bodyData={bodyData} onSigned={onSigned} />
                </>
              ) : signContract ? (
                /* fallback khi không có body chi tiết nhưng có flat contract */
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    <h4 className="font-bold text-blue-800 mb-3 text-sm">HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {[
                        ['Số HĐ', signContract.contract_number],
                        ['Bên A (Cho thuê)', signContract.party_a_name],
                        ['Bên B (Người thuê)', signContract.party_b_name],
                        ['Xe', signContract.vehicle_name],
                        ['Biển số', signContract.vehicle_plate || '—'],
                        [
                          'Thời gian thuê',
                          `${signContract.start_date ? new Date(signContract.start_date).toLocaleDateString('vi-VN') : '—'} → ${signContract.end_date ? new Date(signContract.end_date).toLocaleDateString('vi-VN') : '—'}`,
                        ],
                        ['Số ngày', signContract.duration_days ? `${signContract.duration_days} ngày` : '—'],
                        ['Giá/ngày', signContract.daily_rate != null ? formatMoney(signContract.daily_rate) : '—'],
                        [
                          'Tổng thanh toán',
                          signContract.total_price != null ? formatMoney(signContract.total_price) : '—',
                        ],
                        ['Phương thức TT', signContract.payment_method || '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500">{k}: </span>
                          <span className="font-semibold text-gray-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SignatureSection contract={signContract} bodyData={null} onSigned={onSigned} />
                </>
              ) : null}
            </>
          )}
        </div>

        {/* Footer close */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
