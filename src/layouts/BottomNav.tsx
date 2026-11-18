import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";

const { color } = tokens;

const NAV_ITEMS: { path: string; label: string; icon: (c?: string) => React.JSX.Element }[] = [
  { path: "/dashboard",    label: "Home",         icon: Ico.monitor   },
  { path: "/transaksi",    label: "Transaksi",    icon: Ico.folder    },
  { path: "/kwitansi",     label: "Kwitansi",     icon: Ico.receipt   },
  { path: "/nota",         label: "Nota",         icon: Ico.note      },
  { path: "/undangan",     label: "Undangan",     icon: Ico.folder    },
  { path: "/daftar-hadir", label: "Presensi",     icon: Ico.clipboard },
  { path: "/trash",        label: "Sampah",       icon: Ico.trash     },
];

export function BottomNav() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-40 flex items-center justify-around px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
      {NAV_ITEMS.map(({ path, label, icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors"
            style={{ color: active ? color.brand : "#9ca3af" }}
          >
            <div className={`transition-transform duration-200 ${active ? "scale-110" : "scale-100"}`}>
              {icon(active ? "w-6 h-6" : "w-5 h-5")}
            </div>
            <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
