/**
 * Sidebar — main navigation panel.
 *
 * Active route detection: useLocation().pathname matched against
 * each nav item path.
 * Navigation: useNavigate() — replaces the old onNavigate prop.
 * Admin name/initials: useAuth() — replaces the old adminName prop.
 */
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import { useAuth } from "../contexts/AuthContext";

const { color } = tokens;

const NAV_ITEMS: { path: string; label: string; icon: (c?: string) => React.JSX.Element }[] = [
  { path: "/dashboard",    label: "Dashboard",       icon: Ico.monitor   },
  { path: "/transaksi",    label: "Data Transaksi",  icon: Ico.folder    },
  { path: "/kwitansi",     label: "Print Kwitansi",  icon: Ico.receipt   },
  { path: "/nota",         label: "Nota",            icon: Ico.note      },
  { path: "/undangan",     label: "Undangan",        icon: Ico.folder    },
  { path: "/daftar-hadir", label: "Daftar Hadir",    icon: Ico.clipboard },
  { path: "/trash",        label: "Riwayat Hapus",   icon: Ico.trash     },
];

export function Sidebar() {
  const navigate          = useNavigate();
  const { pathname }      = useLocation();
  const { currentAdmin }  = useAuth();

  const adminName = currentAdmin?.username ?? "";
  const initials  = adminName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 overflow-y-auto flex-shrink-0 bg-white border-r border-gray-100"
      style={{ width: 220 }}
    >
      {/* Brand mark */}
      <div className="px-4 border-b border-gray-100 flex items-center justify-center" style={{ height: 72 }}>
        <img 
          src="/logo-horizontal.png" 
          alt="MyKwitansi" 
          className="h-12 w-auto object-contain" 
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p
          className="text-[11px] font-bold px-3 mb-2 text-gray-400"
          style={{ letterSpacing: "0.1em" }}
        >
          MENU
        </p>
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-left rounded-lg transition-colors duration-150"
              style={{
                background: active ? color.brandSoft : "transparent",
                color: active ? color.brand : "#4b5563",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#111827";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#4b5563";
                }
              }}
            >
              {icon()}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logged-in user */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: color.brand }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 text-sm font-semibold truncate">{adminName}</p>
            <p className="text-xs truncate text-gray-500">
              Administrator
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
