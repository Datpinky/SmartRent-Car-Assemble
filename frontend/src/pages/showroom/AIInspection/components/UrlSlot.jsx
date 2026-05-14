function UrlSlot({ label, url }) {
  console.log('📸 UrlSlot rendered with URL:', url);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="bg-blue-100 text-blue-700 font-bold text-[0.65rem] px-2 py-0.5 rounded-full">TRUOC</span>
        <span className="text-[0.72rem] text-gray-500">{label}</span>
      </div>
      <div className="relative">
        {url ? (
          <>
            <img
              src={url}
              alt={label}
              className="w-full h-24 object-cover rounded-lg border-2 border-blue-500 block"
              onError={(e) => console.error('❌ Image load error:', url, e)}
            />
            <span className="absolute bottom-1 left-1 bg-blue-600/85 text-white text-[0.6rem] px-1.5 py-0.5 rounded font-semibold">
              📦 Anh ban giao
            </span>
          </>
        ) : (
          <div className="w-full h-24 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-500 text-xs">
            No image URL
          </div>
        )}
      </div>
    </div>
  );
}

export default UrlSlot;
