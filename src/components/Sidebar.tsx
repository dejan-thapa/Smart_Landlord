"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Zap,
  FileText,
  CreditCard,
  Settings,
  X,
  Menu,
  Building2,
  ChevronRight,
} from "lucide-react";
import InstallPWAButton from "@/components/InstallPWAButton";
import ThemeToggle from "@/components/ThemeToggle";

function NepaliReceiptIcon({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="10.5"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        रु
      </text>
    </svg>
  );
}

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Meter Input",
    href: "/meter-input",
    icon: Zap,
    exact: false,
  },
  {
    label: "Bills",
    href: "/invoices",
    icon: FileText,
    exact: false,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    exact: false,
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: NepaliReceiptIcon,
    exact: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    exact: false,
  },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border
        ${
          active
            ? "bg-teal-500/15 text-white border-teal-500/30 shadow-xs"
            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
        }
      `}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={`shrink-0 transition-colors ${active ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"}`}
      />
      <span className="flex-1">{item.label}</span>
      {active && (
        <ChevronRight size={14} aria-hidden="true" className="text-teal-400 shrink-0" />
      )}
    </Link>
  );
}

function SidebarContent({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="px-4 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center shadow-md shadow-teal-950/50 shrink-0">
            <Building2 size={18} aria-hidden="true" className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Smart Landlord</p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Property OS</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/";
          const isDashboard = item.exact && pathname === "/";
          return (
            <NavLink
              key={item.href}
              item={item}
              active={active || isDashboard}
              onClick={onLinkClick}
            />
          );
        })}
      </nav>

      {/* Footer: Theme Toggle & PWA Install */}
      <div className="px-3 py-3 border-t border-slate-800/80 space-y-2">
        <ThemeToggle />
        <InstallPWAButton />
        <p className="text-xs text-slate-500 text-center pt-0.5">
          © 2026 Smart Landlord OS
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // Prevent body scroll & listen for Escape when drawer is open
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-slate-950 border-r border-slate-800/80 min-h-screen sticky top-0 h-screen overflow-hidden">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile: Top Bar ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-lg"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center shadow-sm">
              <Building2 size={14} aria-hidden="true" className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">Smart Landlord</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle compact />
            <InstallPWAButton compact />
          </div>
        </div>
      </div>

      {/* ── Mobile: Drawer Overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className="relative flex flex-col w-64 max-w-[82vw] bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 shadow-2xl animate-slide-in-left"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              style={{ top: "calc(0.875rem + env(safe-area-inset-top, 0px))" }}
              className="absolute right-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent
              pathname={pathname}
              onLinkClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}
