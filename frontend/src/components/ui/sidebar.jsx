import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const MD = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MD
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MD);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const SidebarContext = createContext(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within Sidebar');
  return ctx;
}

/**
 * @param {object} props
 * @param {boolean} props.open — mobile drawer mở/đóng (điều khiển từ layout / nút hamburger)
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setOpen
 * @param {boolean} [props.animate=true]
 */
export function Sidebar({ children, open, setOpen, animate = true }) {
  const isMobile = useIsMobile();
  const [desktopHovered, setDesktopHovered] = useState(false);

  useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile, setOpen]);

  const expanded = isMobile ? open : desktopHovered;

  const value = {
    open,
    setOpen,
    animate,
    isMobile,
    expanded,
    desktopHovered,
    setDesktopHovered,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarBody({ className, children, ...props }) {
  const { expanded, animate, isMobile, setDesktopHovered, open } = useSidebar();

  const onMouseEnter = useCallback(() => {
    if (!isMobile) setDesktopHovered(true);
  }, [isMobile, setDesktopHovered]);

  const onMouseLeave = useCallback(() => {
    if (!isMobile) setDesktopHovered(false);
  }, [isMobile, setDesktopHovered]);

  useEffect(() => {
    const w = isMobile ? '0px' : expanded ? '300px' : '76px';
    document.documentElement.style.setProperty('--dashboard-sidebar-width', w);
    return () => document.documentElement.style.removeProperty('--dashboard-sidebar-width');
  }, [isMobile, expanded]);

  return (
    <aside
      role="navigation"
      aria-label="Điều hướng chính"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'fixed left-0 top-0 z-[200] flex h-screen flex-col overflow-hidden border-r border-neutral-200 bg-neutral-100 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200',
        !isMobile && (expanded ? 'md:w-[300px]' : 'md:w-[76px]'),
        !isMobile &&
          animate &&
          'md:transition-[width] md:duration-200 md:ease-out motion-reduce:md:transition-none',
        isMobile && 'w-[260px] max-md:shadow-2xl md:w-auto',
        isMobile && (open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'),
        isMobile && 'max-md:transition-transform max-md:duration-300 max-md:ease-out',
        'max-md:z-[200]',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

/**
 * @param {object} props
 * @param {{ label: string, href?: string, path?: string, icon?: React.ReactNode, onClick?: () => void }} props.link
 */
export function SidebarLink({ link, className, ...rest }) {
  const { setOpen, isMobile, expanded } = useSidebar();
  const location = useLocation();
  const showLabel = isMobile || expanded;

  const closeMobile = () => {
    if (isMobile) setOpen(false);
  };

  const isPathActive =
    link.path &&
    (location.pathname === link.path || location.pathname.startsWith(`${link.path}/`));

  const baseClass = cn(
    'group/sidebar relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
    showLabel ? 'justify-start' : 'justify-center gap-0 px-0',
    'hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80',
    isPathActive && 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary',
    !isPathActive && 'text-neutral-700 dark:text-neutral-200',
    className
  );

  const iconWrap = link.icon && (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5',
        isPathActive && '[&_svg]:text-primary'
      )}
    >
      {link.icon}
    </span>
  );

  const label = (
    <span
      className={cn(
        'min-w-0 overflow-hidden text-left whitespace-nowrap transition-all',
        showLabel ? 'max-w-[220px] opacity-100' : 'max-w-0 opacity-0'
      )}
      aria-hidden={!showLabel}
    >
      {link.label}
    </span>
  );
  const compactA11y = !showLabel ? { 'aria-label': link.label, title: link.label } : {};

  if (link.onClick) {
    return (
      <button
        type="button"
        className={baseClass}
        onClick={() => {
          link.onClick();
          closeMobile();
        }}
        {...compactA11y}
        {...rest}
      >
        {iconWrap}
        {label}
      </button>
    );
  }

  const to = link.path || link.href || '#';

  if (link.path) {
    return (
      <Link
        to={to}
        className={baseClass}
        onClick={closeMobile}
        aria-current={isPathActive ? 'page' : undefined}
        {...compactA11y}
        {...rest}
      >
        {iconWrap}
        {label}
      </Link>
    );
  }

  return (
    <a href={to} className={baseClass} onClick={closeMobile} {...compactA11y} {...rest}>
      {iconWrap}
      {label}
    </a>
  );
}
