"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  History,
} from 'lucide-react';

// Import your existing ColumnInfo component
import ColumnInfo from '@/components/dashboard/text-mode/column-info/column-info';
// Import the new ChatHistory component
import { ChatHistory } from './chat-history';

interface SidebarProps {
  className?: string;
  selectedFiles?: string[];
}

// A collapsible sidebar that provides access to column information and chat history
export function Sidebar({ className = "", selectedFiles = [] }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'column' | 'history'>('history');
  const pathname = usePathname();
  const isSettings = typeof pathname === 'string' && pathname.startsWith('/settings');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isSettings) return null;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Close sidebar on mobile when switching sessions
  const handleSessionSelect = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-lg bg-white shadow-md border border-slate-100 md:hidden hover:bg-slate-50 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? 
          <X className="h-5 w-5 text-slate-600" /> : 
          <Menu className="h-5 w-5 text-slate-600" />
        }
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300" 
          onClick={toggleSidebar} 
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-20" : "w-80"}
          md:translate-x-0 md:static md:z-auto
          ${className}
        `}
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/50 backdrop-blur-sm p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex-shrink-0">
                  {activeTab === 'column' ? (
                    <BarChart3 className="h-5 w-5 text-white" />
                  ) : (
                    <History className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-lg font-bold text-slate-800 truncate">
                    {activeTab === 'column' ? 'Column Info' : 'Chat History'}
                  </h2>
                  <p className="text-xs text-slate-500 truncate">
                    {activeTab === 'column' ? 'Analyze column statistics' : 'Manage your conversations'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mx-auto">
                {activeTab === 'column' ? (
                  <BarChart3 className="h-5 w-5 text-white" />
                ) : (
                  <History className="h-5 w-5 text-white" />
                )}
              </div>
            )}

            {/* Desktop collapse button */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 transition-all duration-200 flex-shrink-0"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!isCollapsed && (
          <div className="flex border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
            <button
              onClick={() => setActiveTab('column')}
              className={`
                flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${activeTab === 'column' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
                }
              `}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Column Info</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${activeTab === 'history' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
                }
              `}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
          </div>
        )}

        {/* Vertical Tabs for Collapsed State */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <button
              onClick={() => setActiveTab('column')}
              className={`
                p-3 rounded-lg transition-all duration-200
                ${activeTab === 'column' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }
              `}
              aria-label="Column Info"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                p-3 rounded-lg transition-all duration-200
                ${activeTab === 'history' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }
              `}
              aria-label="History"
            >
              <History className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <div className={activeTab === 'column' ? 'h-full' : 'hidden'}>
              <ColumnInfo selectedFiles={selectedFiles} />
            </div>
            <div className={activeTab === 'history' ? 'h-full' : 'hidden'}>
              <ChatHistory onSessionSelect={handleSessionSelect} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}