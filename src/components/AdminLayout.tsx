import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  CalendarPlus,
  ClipboardList,
  BarChart2,
  Settings,
  Database,
  Grid3x3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  UserCircle,
  Menu,
  X,
  Map,
  FileBarChart,
  Building2,
  Activity
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Nav Structure
// ─────────────────────────────────────────────────────────────────────────────
const navItems: NavItem[] = [
  { label: "Dashboard",          path: "/admin",                  icon: LayoutDashboard },
  { label: "Schedule SIMS",      path: "/admin/create-activity",  icon: CalendarPlus, badge: "New" },
  { label: "All SIMS Activities", path: "/admin/activities",       icon: ClipboardList },
  {
    label: "SIMS Coverage Reports",
    path: "/admin/coverage",
    icon: Map,
    children: [
      { label: "Coverage Matrix",  path: "/admin/coverage/matrix",   icon: Grid3x3 },
      { label: "SET Reports",      path: "/admin/coverage/sets",     icon: FileBarChart },
      { label: "Partner Reports",  path: "/admin/coverage/partners", icon: Building2 },
    ],
  },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: TrendingUp,
    children: [
      { label: "CEE Grade Trends", path: "/admin/analytics/grades",  icon: BarChart2 },
      { label: "Site Performance", path: "/admin/analytics/sites",   icon: Activity },
      { label: "State Comparison", path: "/admin/analytics/states",  icon: Map },
    ],
  },
  { label: "CEE Manager",        path: "/admin/cee-manager",      icon: Grid3x3 },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
    children: [
      { label: "Org & Facilities", path: "/admin/settings", icon: Building2 },
      { label: "Database Setup",   path: "/seeder",         icon: Database },
    ],
  },
  { label: "My Profile",         path: "/admin/profile",          icon: UserCircle },
];

// ─────────────────────────────────────────────────────────────────────────────
// Avatar helper – shows photo if available, else initials
// ─────────────────────────────────────────────────────────────────────────────
const Avatar: React.FC<{
  photoURL?: string | null;
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ photoURL, initials, size = "md", className = "" }) => {
  const dim = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const text = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt="Profile"
        className={`${dim} rounded-full object-cover shrink-0 ring-2 ring-wine-800/30 ${className}`}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  return (
    <div className={`${dim} rounded-full wine-gradient flex items-center justify-center shrink-0 shadow-inner ${className}`}>
      <span className={`text-white font-black ${text}`}>{initials}</span>
    </div>
  );
};

// Export Avatar for use in other components
export { Avatar };

// ─────────────────────────────────────────────────────────────────────────────
// Individual Nav Link
// ─────────────────────────────────────────────────────────────────────────────
const NavLink: React.FC<{
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}> = ({ item, collapsed, depth = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => location.pathname.startsWith(c.path)) ?? false
  );

  const isActive =
    item.path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(item.path);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setOpen(o => !o);
    } else {
      navigate(item.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        title={collapsed ? item.label : undefined}
        className={`
          w-full flex items-center gap-3 rounded-xl transition-all duration-200 group
          ${depth === 0 ? "px-3 py-2.5" : "pl-10 pr-3 py-2"}
          ${isActive && !hasChildren
            ? "bg-wine-800 text-white shadow-md shadow-wine-900/20"
            : "text-slate-400 hover:bg-white/60 hover:text-slate-700"}
        `}
      >
        <item.icon
          className={`shrink-0 ${depth === 0 ? "w-5 h-5" : "w-4 h-4"} ${
            isActive && !hasChildren ? "text-white" : "text-slate-400 group-hover:text-wine-800"
          }`}
        />

        {!collapsed && (
          <>
            <span className={`flex-1 text-left font-semibold truncate ${depth === 0 ? "text-[13px]" : "text-[12px]"}`}>
              {item.label}
            </span>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-black bg-wine-100 text-wine-800 rounded-full uppercase tracking-wider">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""} text-slate-400`} />
            )}
          </>
        )}
      </button>

      {/* Children */}
      {hasChildren && !collapsed && open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children!.map(child => (
            <NavLink key={child.path} item={child} collapsed={false} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Layout Shell
// ─────────────────────────────────────────────────────────────────────────────
interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = "Admin Console",
  subtitle,
  headerRight,
}) => {
  const { profile, logout } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = `${profile?.firstName?.charAt(0) ?? "A"}${profile?.lastName?.charAt(0) ?? ""}`;

  return (
    <div className="min-h-screen flex bg-[#F6F4F5]">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SIDEBAR                                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          flex flex-col
          bg-gradient-to-b from-[#0F0508] via-[#180A10] to-[#0F0508]
          border-r border-white/5 shadow-2xl
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[70px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ── Logo ── */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/8 shrink-0 ${collapsed ? "justify-center" : ""}`}>
          {/* Use simsicon2.png, fall back to letter S */}
          <img
            src="/simsicon2.png"
            alt="e-SIMS"
            className="w-9 h-9 rounded-xl object-contain shadow-lg shrink-0"
            onError={e => {
              // fallback: hide image and show letter tile
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
              const sibling = img.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.style.display = "flex";
            }}
          />
          {/* Hidden fallback tile */}
          <div className="w-9 h-9 rounded-xl wine-gradient items-center justify-center shadow-lg shrink-0 hidden">
            <span className="text-white font-black text-sm">S</span>
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-tight leading-tight truncate">e-SIMS Admin</p>
              <p className="text-white/30 text-[10px] uppercase tracking-widest">Management Portal</p>
            </div>
          )}
        </div>

        {/* ── Scrollable nav ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
          {navItems.map(item => (
            <NavLink key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* ── Bottom: User card + Profile link + collapse toggle ── */}
        <div className="shrink-0 border-t border-white/8 p-3 space-y-1.5">

          {/* User card – clickable → goes to profile page */}
          <button
            onClick={() => navigate("/admin/profile")}
            title={collapsed ? "My Profile" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition group ${collapsed ? "justify-center" : ""}`}
          >
            <Avatar photoURL={profile?.photoURL} initials={initials} size="md" />
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-white text-[12px] font-bold truncate leading-tight group-hover:text-wine-300 transition">
                  {profile?.firstName} {profile?.lastName}
                </p>
                <p className="text-white/30 text-[10px] truncate mt-0.5">{profile?.organizationName}</p>
              </div>
            )}
            {!collapsed && <Shield className="w-3.5 h-3.5 text-wine-400 shrink-0" />}
          </button>

          <button
            onClick={logout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-[12px] font-semibold ${collapsed ? "justify-center" : ""}`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/20 hover:bg-white/5 hover:text-white/50 transition text-[11px] font-medium ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"}`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              {subtitle && (
                <p className="text-[9px] font-black text-wine-900 uppercase tracking-widest bg-wine-100/60 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  {subtitle}
                </p>
              )}
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerRight}

            {/* Profile avatar pill – clickable → profile page */}
            <button
              onClick={() => navigate("/admin/profile")}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-wine-50 hover:border-wine-200 transition group"
            >
              <Avatar photoURL={profile?.photoURL} initials={initials} size="sm" />
              <span className="text-xs font-semibold text-slate-600 max-w-[120px] truncate group-hover:text-wine-800">
                {profile?.firstName} {profile?.lastName}
              </span>
              <Shield className="w-3.5 h-3.5 text-wine-700" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
