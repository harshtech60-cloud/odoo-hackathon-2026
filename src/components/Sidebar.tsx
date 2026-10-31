import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarDays,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  BarChart3,
  UserCheck,
  Zap,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'plans'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'discounts'
  | 'reports'
  | 'portal';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueInvoicesCount: number;
  activeSubsCount: number;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  dueInvoicesCount,
  activeSubsCount,
  userRole,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'plans', label: 'Plans', icon: CalendarDays },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, badge: activeSubsCount },
    { id: 'invoices', label: 'Invoices', icon: Receipt, badge: dueInvoicesCount },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'portal', label: 'Customer Portal', icon: UserCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 border-r border-slate-800 shadow-xl select-none">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-wider text-white flex items-center gap-1.5">
              BRIGHTLOOP
            </h2>
            <p className="text-xs text-blue-300 font-medium tracking-wide">
              Subscription Manager
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {navItems.slice(0, 9).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-slate-800 text-blue-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Portals & Views
        </div>
        {navItems.slice(9).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                  : 'text-emerald-300/80 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                <span>{item.label}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded">
                Live
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="text-xs">
            <p className="font-semibold text-slate-300">Odoo × FLUX Hackathon</p>
            <p className="text-[11px] text-slate-400">Team Brightloop 2026</p>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
            v1.2
          </span>
        </div>
      </div>
    </aside>
  );
};
