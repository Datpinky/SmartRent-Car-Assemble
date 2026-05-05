import React, { useRef, useState, useId } from 'react';
import { FaCloudUploadAlt, FaTimes, FaCheckCircle, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import uploadService from '../../services/uploadService';

/**
 * FileUpload
 * Props:
 *   label       - field label text
 *   accept      - MIME types (default 'image/*')
 *   multiple    - allow multi-file (default false)
 *   maxFiles    - max files per batch (default 5, matches backend limit)
 *   onUpload    - callback(uploadedUrls: string[]) called after successful upload
 *   onFiles     - callback(files: File[]) called with raw File objects (local-only mode)
 *   hint        - helper text under the drop zone
 *   preview     - show image thumbnails (default true)
 *   autoUpload  - immediately upload to backend on file select (default true)
 *                 Set to false to stay in local-only mode (File objects only)
 */
const FileUpload = ({
  label,
  accept = 'image/*',
  multiple = false,
  maxFiles = 5,
  onUpload,
  onFiles,
  hint,
  preview = true,
  autoUpload = true,
}) => {
  const inputId = useId();
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef();

  const handleFiles = async (newFiles) => {
    const arr = Array.from(newFiles).slice(0, maxFiles);
    const withPrev = arr.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      url: preview && f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      name: f.name,
      uploaded: false,
      cloudUrl: null,
    }));
    const updated = multiple ? [...files, ...withPrev].slice(0, maxFiles) : withPrev;
    setFiles(updated);
    setUploadError('');

    if (onFiles) onFiles(updated.map(f => f.file));

    if (!autoUpload) return;

    setUploading(true);
    try {
      const rawFiles = updated.map(f => f.file);
      const results = await uploadService.uploadImages(rawFiles);
      const cloudUrls = results.map(r => r.url).filter(Boolean);

      setFiles(prev =>
        prev.map((f, i) => ({
          ...f,
          uploaded: true,
          cloudUrl: cloudUrls[i] || f.cloudUrl,
        }))
      );

      if (onUpload) onUpload(cloudUrls);
    } catch (err) {
      setUploadError(err.message || 'Upload thất bại. Vui lòng thử lại.');
      if (onFiles) onFiles(updated.map(f => f.file));
    } finally {
      setUploading(false);
    }
  };

  const remove = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    setUploadError('');
    if (onFiles) onFiles(updated.map(f => f.file));
    if (!autoUpload && onUpload) onUpload([]);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <label htmlFor={inputId} className="text-[0.85rem] font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* Drop zone — acts as a label for the hidden input so click activates the picker */}
      <label
        htmlFor={inputId}
        className={`border-2 border-dashed rounded-xl py-7 px-5 text-center cursor-pointer transition-[border-color,background-color]
          ${dragging ? 'border-primary bg-primary-light' : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary-light'}
          ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <FaSpinner aria-hidden="true" className="text-[2rem] mb-2 mx-auto text-primary animate-spin" />
        ) : (
          <FaCloudUploadAlt aria-hidden="true" className={`text-[2rem] mb-2 mx-auto transition-colors ${dragging ? 'text-primary' : 'text-gray-400'}`} />
        )}
        <div className="text-[0.85rem] text-gray-500">
          {uploading
            ? 'Đang tải lên…'
            : (<>Kéo thả hoặc <span className="text-primary font-semibold underline">chọn file</span></>)
          }
        </div>
        {hint && <div className="text-[0.75rem] text-gray-400 mt-1">{hint}</div>}
        {maxFiles && (
          <div className="text-[0.72rem] text-gray-400 mt-0.5">Tối đa {maxFiles} file</div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          name="file-upload"
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
      </label>

      {uploadError && (
        <div
          role="alert"
          className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-[0.8rem]"
        >
          <FaExclamationCircle aria-hidden="true" className="shrink-0" />
          {uploadError}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              {f.url
                ? <img src={f.cloudUrl || f.url} alt={f.name} width={40} height={40} className="w-10 h-10 object-cover rounded-md" />
                : (
                  f.uploaded
                    ? <FaCheckCircle aria-hidden="true" className="text-emerald-600 text-[1.2rem]" />
                    : <FaCloudUploadAlt aria-hidden="true" className="text-gray-400 text-[1.2rem]" />
                )
              }
              <span className="flex-1 text-[0.8rem] text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                {f.name}
              </span>
              {f.uploaded && !uploading && (
                <span className="text-[0.7rem] text-emerald-600 font-medium shrink-0">✓ Đã tải</span>
              )}
              {!uploading && (
                <button
                  type="button"
                  aria-label={`Xóa file ${f.name}`}
                  className="text-gray-400 p-1 rounded flex items-center justify-center hover:text-red-600 hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  onClick={() => remove(f.id)}
                >
                  <FaTimes aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
