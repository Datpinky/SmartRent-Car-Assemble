import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const NavGroup = ({ item, location, collapsed }) => {
  const hasActiveChild = (item.items || []).some(
    (sub) => location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`),
  );
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const Icon = item.icon;

  if (collapsed) {
    return (
      <div
        title={item.label}
        className={`
          flex items-center justify-center rounded-lg p-2.5 transition-all duration-150
          ${hasActiveChild ? 'bg-[#ecfdf5] text-[#00b14f]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
        `}
      >
        <Icon size={18} className={`shrink-0 ${hasActiveChild ? 'text-[#00b14f]' : 'text-gray-400'}`} />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
          ${hasActiveChild ? 'text-[#00b14f]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
        `}
      >
        <Icon
          size={18}
          className={`shrink-0 transition-colors ${
            hasActiveChild ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.badge != null && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
            {item.badge}
          </span>
        )}
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-gray-400" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
          {(item.items || []).map((sub) => {
            const SubIcon = sub.icon;
            const subActive = location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`);
            return (
              <Link
                key={sub.path}
                to={sub.path}
                className={`
                  group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] font-medium no-underline transition-all duration-150
                  ${subActive ? 'bg-[#ecfdf5] text-[#00b14f]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <SubIcon
                  size={15}
                  className={`shrink-0 ${subActive ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'}`}
                />
                <span className="flex-1 truncate">{sub.label}</span>
                {sub.badge != null && (
                  <span className="ml-auto rounded-full bg-[#00b14f]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#00b14f]">
                    {sub.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NavGroup;