import React, { useState, useMemo, useId } from 'react';
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PAGE_SIZE = 10;

const DataTable = ({
  columns,
  data = [],
  searchable = true,
  searchPlaceholder = 'Tìm kiếm…',
  /** Nếu có: lọc theo các key trên mỗi row (vd. ['name','email','phone']). Mặc định: theo accessor của columns */
  searchFields,
  actions,
  emptyText = 'Không có dữ liệu',
}) => {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    if (searchFields && searchFields.length) {
      return data.filter((row) =>
        searchFields.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.accessor ? row[col.accessor] : '';
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns, searchFields]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div className="bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-[#f0f0f0] overflow-hidden">
      {(searchable || actions) && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 gap-3 flex-wrap">
          {searchable && (
            <div className="flex items-center gap-2 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg px-3 py-[7px] min-w-[240px] flex-1 max-w-[360px] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <label htmlFor={searchId} className="sr-only">{searchPlaceholder}</label>
              <FaSearch aria-hidden="true" className="text-gray-400 text-[0.8rem] shrink-0" />
              <input
                id={searchId}
                value={search}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="border-none bg-transparent text-[0.85rem] text-gray-700 w-full focus:outline-none"
              />
            </div>
          )}
          {actions && <div className="flex gap-2 items-center">{actions}</div>}
        </div>
      )}
      <div className="overflow-x-auto min-w-0">
        <table className="w-full table-fixed border-collapse text-[0.85rem]">
          <thead>
            <tr className="bg-gray-50">
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3.5 py-[11px] text-left text-[0.75rem] font-semibold text-gray-500 uppercase tracking-[0.04em] whitespace-nowrap border-b border-[#f0f0f0] ${col.sortable ? 'cursor-pointer select-none hover:text-primary' : ''}`}
                  style={col.width ? { width: col.width } : {}}
                  aria-sort={
                    col.sortable
                      ? sortKey === (col.accessor || col.key)
                        ? (sortDir === 'asc' ? 'ascending' : 'descending')
                        : 'none'
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.accessor || col.key)}
                      aria-label={`Sắp xếp theo ${col.label}`}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.04em] font-semibold text-gray-500 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                    >
                      {col.label}
                      {sortKey === (col.accessor || col.key) && (
                        <span aria-hidden="true" className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-400 py-10 text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : pageData.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50 border-b border-gray-50 last:border-b-0">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-3.5 py-[11px] text-gray-700 align-middle min-w-0 [overflow-wrap:anywhere] [word-break:break-word]"
                    style={col.align ? { textAlign: col.align } : {}}
                  >
                    {col.render ? col.render(row) : (col.accessor ? row[col.accessor] : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2.5">
        <span className="text-[0.8rem] text-gray-400 tabular-nums">
          Hiển thị {pageData.length} / {sorted.length} kết quả
        </span>
        <nav aria-label="Phân trang" className="flex gap-1 items-center">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            aria-label="Trang trước"
            className="min-w-[30px] h-[30px] border-[1.5px] border-gray-200 bg-white rounded-[7px] flex items-center justify-center text-[0.8rem] text-gray-700 transition-[border-color,color] disabled:opacity-40 disabled:cursor-default hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === '...'
              ? <span key={i} className="text-gray-400 text-[0.85rem] px-0.5" aria-hidden="true">…</span>
              : <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-label={`Trang ${p}`}
                  aria-current={page === p ? 'page' : undefined}
                  className={`min-w-[30px] h-[30px] border-[1.5px] rounded-[7px] flex items-center justify-center text-[0.8rem] transition-[border-color,color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary tabular-nums
                    ${page === p
                      ? 'bg-primary border-primary text-white font-semibold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                    }`}
                >{p}</button>
            )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            aria-label="Trang sau"
            className="min-w-[30px] h-[30px] border-[1.5px] border-gray-200 bg-white rounded-[7px] flex items-center justify-center text-[0.8rem] text-gray-700 transition-[border-color,color] disabled:opacity-40 disabled:cursor-default hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default DataTable;
