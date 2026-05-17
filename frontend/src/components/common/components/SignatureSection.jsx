import { useRef, useState } from 'react';
import { FaFilePdf, FaFileSignature, FaSpinner } from 'react-icons/fa';
import contractService from '../../../services/contractService';
import SignaturePad from '../SignaturePad';
import { SignedBadge } from '../contractModal.helpers';

const SignatureSection = ({ contract, bodyData, onSigned }) => {
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
  const partyARow = Array.isArray(signaturesFromBody?.table) ? signaturesFromBody.table.find((r) => !/bên\s*b/i.test(r.party)) : null;
  const partyALabel = partyARow?.party || 'BÊN CHO THUÊ (Bên A)';
  const partyAInstruction = partyARow?.instruction || 'Ký và ghi rõ họ tên / đóng dấu (nếu có)';
  const partyAName = partyARow?.name || contract?.party_a_name || null;
  const partyASignedAt = partyARow?.signedAt || contract?.signed_at || null;
  const partyAImage = partyARow?.signatureImage || contract?.showroom_signature || null;
  const signerRow = Array.isArray(signaturesFromBody?.table) ? signaturesFromBody.table.find((r) => /bên\s*b/i.test(r.party)) : null;

  const handleSign = async () => {
    if (!signature) { setSignError('Vui lòng vẽ chữ ký trước khi xác nhận.'); return; }
    if (!contract?._id) { setSignError('Không tìm thấy ID hợp đồng để ký.'); return; }
    setSignError(''); setSigning(true);
    try {
      const updated = await contractService.signContract(contract._id, signature);
      setSignedContract(updated); setDone(true);
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
      <div className="grid items-start sm:grid-cols-2 gap-4 mb-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="font-extrabold text-gray-800 text-[0.82rem]">{partyALabel}</p>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">{partyAInstruction}</p>
          </div>
          <div className="border-t border-gray-200 pt-3">
            {partyAName ? <SignedBadge name={partyAName} signedAt={partyASignedAt} signatureImage={partyAImage} /> : <div className="text-[0.72rem] text-gray-400 italic">Chưa có xác nhận từ showroom</div>}
          </div>
        </div>
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="font-extrabold text-gray-800 text-[0.82rem]">{signerRow?.party || 'BÊN THUÊ (Bên B)'}</p>
            <p className="text-[0.72rem] text-gray-500 mt-0.5">{done ? 'Đã ký xác nhận điện tử.' : signerRow?.instruction || 'Ký và ghi rõ họ tên'}</p>
          </div>
          <div className="border-t border-blue-100 pt-3">
            {done ? (
              <SignedBadge name={signedContract?.party_b_name || signerRow?.name || null} signedAt={signedContract?.renter_signed_at || signedContract?.signed_at || signerRow?.signedAt} signatureImage={signedContract?.renter_signature || signerRow?.signatureImage || null} />
            ) : (
              <div>
                <SignaturePad key={padKey.current} width={260} height={110} label="Vẽ chữ ký của bạn"
                  onSign={(s) => { setSignature(s); setConfirming(false); }}
                  onClear={() => { setSignature(null); setConfirming(false); }} />
                {signError && <p className="text-red-600 text-xs mt-2">{signError}</p>}
                {!confirming ? (
                  <button type="button" onClick={() => { if (!signature) { setSignError('Vui lòng vẽ chữ ký trước khi xác nhận.'); return; } setSignError(''); setConfirming(true); }} disabled={!signature}
                    className={`mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 border-none rounded-lg text-white font-bold text-sm cursor-pointer hover:bg-blue-700 transition-colors ${!signature ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <FaFileSignature /> Ký xác nhận hợp đồng
                  </button>
                ) : (
                  <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                    <p className="text-[0.8rem] font-bold text-amber-800 mb-1">⚠️ Xác nhận chữ ký</p>
                    <p className="text-[0.75rem] text-amber-700 mb-3 leading-snug">Sau khi xác nhận, <strong>chữ ký không thể thay đổi</strong>. Hợp đồng có hiệu lực pháp lý ngay sau đó.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirming(false)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer">Hủy</button>
                      <button type="button" onClick={handleSign} disabled={signing} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 border-none rounded-lg text-white font-bold text-xs cursor-pointer hover:bg-blue-700 ${signing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {signing ? <><FaSpinner className="animate-spin" /> Đang ký...</> : <>✓ Xác nhận ký</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {!partyAImage && <p className="text-[0.72rem] text-amber-600 mb-3 leading-snug">⚠️ Showroom chưa cài chữ ký — PDF sẽ có ô trống Bên A. Yêu cầu showroom vào <strong>Hồ sơ → Chữ ký điện tử</strong> để thiết lập, sau đó nhấn <strong>Tạo lại PDF</strong>.</p>}
      {done && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {signedContract?.pdf_url && (
            <a href={signedContract.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-xs no-underline hover:bg-blue-700 transition-colors">
              <FaFilePdf /> Tải hợp đồng PDF
            </a>
          )}
          {signedContract?._id && (
            <button type="button" disabled={regenerating} onClick={async () => { setRegenerating(true); setRegenError(''); try { const updated = await contractService.regeneratePdf(signedContract._id); setSignedContract(updated); } catch (err) { setRegenError(err?.response?.data?.message || 'Tạo lại PDF thất bại.'); } finally { setRegenerating(false); } }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer ${regenerating ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {regenerating ? <><FaSpinner className="animate-spin" /> Đang tạo...</> : <>↻ Tạo lại PDF</>}
            </button>
          )}
          {regenError && <p className="text-red-600 text-xs">{regenError}</p>}
        </div>
      )}
      {signaturesFromBody?.copiesNote && <p className="text-[0.72rem] text-gray-500 text-center italic">{signaturesFromBody.copiesNote}</p>}
    </div>
  );
};

export default SignatureSection;
