'use client'

import { ReactNode } from 'react'

interface RTLWrapperProps {
  children: ReactNode
  className?: string
}

/**
 * RTL Wrapper component for ensuring proper RTL layout
 * Wraps content with RTL direction and proper text alignment
 */
export default function RTLWrapper({ children, className = '' }: RTLWrapperProps) {
  return (
    <div dir="rtl" className={className}>
      {children}
    </div>
  )
}

