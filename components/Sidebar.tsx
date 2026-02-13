import React, { useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { Icons } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  activeView: ViewState;
  appName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, activeView, appName }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const menuItems: { id: ViewState; label: string; icon?: React.ReactNode }[] = [
    { id: 'dashboard', label: 'المبيعات' },
    { id: 'invoices', label: 'الفواتير المحفوظة' },
    { id: 'soldItems', label: 'الأصناف المباعة' },
    { id: 'settings', label: 'الإعدادات', icon: <Icons.Settings /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      
      {/* Sidebar Panel */}
      <div 
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 border-b bg-emerald-600 text-white">
          <h2 className="text-xl font-bold">{appName}</h2>
        </div>
        
        <nav className="p-4 flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className={`flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                activeView === item.id 
                  ? 'bg-emerald-100 text-emerald-800 font-bold' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};
