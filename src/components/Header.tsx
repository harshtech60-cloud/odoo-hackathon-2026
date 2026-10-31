import React from 'react';
import { UserRole } from '../types';
import { Shield, UserCheck, RefreshCw, Sparkles, Building2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  currentRole,
  onRoleChange,
  onResetData,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-xs">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Reset Demo Data */}
        <button
          onClick={onResetData}
          title="Restore standard sample data"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Demo</span>
        </button>

        {/* Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 font-semibold px-2">Role:</span>
          <button
            onClick={() => onRoleChange('admin')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              currentRole === 'admin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onRoleChange('staff')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              currentRole === 'staff'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => onRoleChange('customer')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              currentRole === 'customer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {currentRole === 'admin'
                ? 'System Admin'
                : currentRole === 'staff'
                ? 'Billing Staff'
                : 'Acme Client'}
            </p>
            <p className="text-xs text-slate-500 capitalize">{currentRole} Access</p>
          </div>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
              currentRole === 'admin'
                ? 'bg-blue-600 text-white'
                : currentRole === 'staff'
                ? 'bg-indigo-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {currentRole === 'admin' ? 'A' : currentRole === 'staff' ? 'S' : 'C'}
          </div>
        </div>
      </div>
    </header>
  );
};
