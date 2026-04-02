'use client'

import { createContext, useContext, useState } from 'react'

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

  return (
    <MobileNavContext.Provider value={{ isVisible }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export const useMobileNav = () => useContext(MobileNavContext)
