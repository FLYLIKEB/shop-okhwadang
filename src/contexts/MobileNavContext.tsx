'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface MobileNavContextValue {
  isVisible: boolean
}

const MobileNavContext = createContext<MobileNavContextValue>({ isVisible: true })

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    fetch('/api/settings?group=general')
      .then((res) => res.json())
      .then((data: Array<{ key: string; value: string }>) => {
        const setting = data.find((s) => s.key === 'mobile_bottom_nav_visible')
        setIsVisible(setting ? setting.value === 'true' : true)
      })
      .catch(() => setIsVisible(true))
  }, [])

  return (
    <MobileNavContext.Provider value={{ isVisible }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export const useMobileNav = () => useContext(MobileNavContext)
