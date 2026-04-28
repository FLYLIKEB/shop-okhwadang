'use client'

import { createContext, useContext, useMemo, useState } from 'react'

interface MobileNavContextValue {
  isVisible: boolean
}

const MobileNavContext = createContext<MobileNavContextValue>({ isVisible: true })

export function MobileNavProvider({
  children,
  initialVisible = true,
}: {
  children: React.ReactNode
  initialVisible?: boolean
}) {
  const [isVisible] = useState(initialVisible)

  const value = useMemo(() => ({ isVisible }), [isVisible])

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  )
}

export const useMobileNav = () => useContext(MobileNavContext)
