import React from 'react'

interface UtilityLayoutProps {
  children: React.ReactNode
}

export default function UtilityLayout({ children }: UtilityLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}