import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShieldCheck, LogOut, LogOut as DoorOpen, Printer, User } from "lucide-react";
import { api } from "@/lib/api/client";

const navItems = [
  { path: "/", label: "Gate In", icon: Home },
  { path: "/customs", label: "Customs", icon: ShieldCheck },
  { path: "/gateout", label: "Gate Out", icon: DoorOpen },
  { path: "/reprint", label: "Reprint", icon: Printer },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear apikey, token, and username from localStorage
    api.logout();
    navigate("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-2 py-2 z-50">
      <div className="max-w-2xl mx-auto grid grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-400 bg-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </nav>
  );
}
