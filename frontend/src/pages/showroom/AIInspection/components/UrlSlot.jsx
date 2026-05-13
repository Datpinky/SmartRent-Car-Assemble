function UrlSlot({ label, url }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="bg-blue-100 text-blue-700 font-bold text-[0.65rem] px-2 py-0.5 rounded-full">TRUOC</span>
        <span className="text-[0.72rem] text-gray-500">{label}</span>
      </div>
      <div className="relative">
        <img src={url} alt={label} className="w-full h-24 object-cover rounded-lg border-2 border-blue-500 block" />
        <span className="absolute bottom-1 left-1 bg-blue-600/85 text-white text-[0.6rem] px-1.5 py-0.5 rounded font-semibold">
          📦 Anh ban giao
        </span>
      </div>
    </div>
  );
}

export default UrlSlot;
