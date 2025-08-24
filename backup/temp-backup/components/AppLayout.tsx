'use client';

import React from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '../../../../packages/shared/ui/sidebar';
import { AppSidebar } from './AppSidebar';

export interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  className: _className = '' 
}) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-productory-purple-1 rounded flex items-center justify-center text-white text-sm font-bold">
              GT
            </div>
            <span className="font-semibold">Gamma Timetable</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

AppLayout.displayName = 'AppLayout';