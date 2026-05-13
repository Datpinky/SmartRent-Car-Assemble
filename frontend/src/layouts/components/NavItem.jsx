import { Link } from 'react-router-dom';

const NavItem = ({ item, active, collapsed }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-all duration-150
        ${active ? 'bg-[#ecfdf5] text-[#00b14f]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
        ${collapsed ? 'justify-center px-2.5' : ''}
      `}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-colors ${
          active ? 'text-[#00b14f]' : 'text-gray-400 group-hover:text-gray-600'
        }`}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge != null && (
        <span className="ml-auto rounded-full bg-[#00b14f]/10 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-[#00b14f]">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default NavItem;