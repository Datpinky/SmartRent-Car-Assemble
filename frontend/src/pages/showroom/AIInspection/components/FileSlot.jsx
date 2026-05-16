import { useEffect, useRef, useState } from 'react';
import { FaCloudUploadAlt, FaTimesCircle } from 'react-icons/fa';
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isAcceptedImageFile } from '../../../../utils/acceptedImageTypes';

function FileSlot({ label, hint, file, onFile, type }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const isBefore = type === 'before';

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1.5">
        <span
          className={`font-bold text-[0.65rem] px-2 py-0.5 rounded-full ${isBefore ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
        >
          {isBefore ? 'TRUOC' : 'SAU'}
        </span>
        <span className="text-[0.72rem] text-gray-500">{label}</span>
      </div>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={label}
            className={`w-full h-24 object-cover rounded-lg block border-2 ${isBefore ? 'border-blue-500' : 'border-green-600'}`}
          />
          <button
            type="button"
            onClick={() => onFile(null)}
            className="absolute top-1 right-1 bg-black/55 border-0 rounded-full w-5 h-5 cursor-pointer flex items-center justify-center"
          >
            <FaTimesCircle className="text-white text-xs" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full h-24 border-2 border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors ${isBefore ? 'border-blue-400 bg-blue-50 hover:bg-blue-100' : 'border-green-500 bg-green-50 hover:bg-green-100'}`}
        >
          <FaCloudUploadAlt className={`text-2xl ${isBefore ? 'text-blue-500' : 'text-green-600'}`} />
          <span className="text-[0.68rem] text-gray-500 text-center px-1.5 leading-tight">{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && isAcceptedImageFile(f)) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default FileSlot;
