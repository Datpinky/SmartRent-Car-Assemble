export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

export const SectionTitle = ({ children }) => (
  <h4 className="text-sm font-extrabold text-gray-900 mt-4 mb-2 border-b border-gray-200 pb-1">{children}</h4>
);

export const BulletList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="list-disc pl-5 text-[0.78rem] text-gray-600 space-y-1 leading-relaxed">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
};

export const PartyBlock = ({ title, contact }) => {
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
};

export const SignedBadge = ({ name, signedAt, signatureImage }) => (
  <div className="flex flex-col gap-2">
    {signatureImage && (
      <div className="bg-white border border-gray-200 rounded-lg p-2 inline-block">
        <img src={signatureImage} alt="Chữ ký" className="max-h-20 max-w-[200px] object-contain" />
      </div>
    )}
    <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <span className="text-white text-sm">✓</span>
      </div>
      <div>
        {name && <p className="font-bold text-emerald-900 text-[0.8rem] leading-tight">{name}</p>}
        <p className="text-emerald-700 text-[0.72rem] mt-0.5">Đã xác nhận điện tử{signedAt ? ` — ${fmtDate(signedAt)}` : ''}</p>
      </div>
    </div>
  </div>
);