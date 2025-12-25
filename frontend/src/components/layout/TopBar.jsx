import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';

function TopBar({ onToggleSidebar, username, onLogout, sidebarOpen }) {
  return (
    <header
      className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 transition-all duration-300"
      style={{ left: sidebarOpen ? '240px' : '0' }}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Burger Menu */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} className="text-gray-700" />
        </button>

        {/* Right: User Info & Logout */}
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{username}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;