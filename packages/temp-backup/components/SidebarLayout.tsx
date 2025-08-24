'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

export interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-6 pt-20 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

SidebarLayout.displayName = 'SidebarLayout';