"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type ActiveCity = "all" | "Surat" | "Vadodara"

export type BrandInfo = {
  name: string
  logoText: string
  website: string
  themeClass: string
  cityLabel: string
}

type BrandContextType = {
  activeCity: ActiveCity
  activeBrand: BrandInfo
  setActiveCity: (city: ActiveCity) => void
  isReady: boolean
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

const brands: Record<ActiveCity, BrandInfo> = {
  all: {
    name: "Friends Factory Cafe",
    logoText: "Friends Factory",
    website: "friendsfactorycafe.com",
    themeClass: "theme-ffc",
    cityLabel: "All Locations",
  },
  Surat: {
    name: "HIVY – Place for Celebrations",
    logoText: "HIVY",
    website: "hivy.co.in",
    themeClass: "theme-hivy",
    cityLabel: "Surat",
  },
  Vadodara: {
    name: "Friends Factory Cafe",
    logoText: "Friends Factory",
    website: "friendsfactorycafe.com",
    themeClass: "theme-ffc",
    cityLabel: "Vadodara",
  },
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [activeCity, setActiveCityState] = useState<ActiveCity>("all")
  const [isReady, setIsReady] = useState(false)

  // Hydrate activeCity from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("crm_active_city") as ActiveCity
      if (stored && brands[stored]) {
        setActiveCityState(stored)
      }
    } catch (e) {
      console.error("Failed to read localStorage crm_active_city", e)
    } finally {
      setIsReady(true)
    }
  }, [])

  const setActiveCity = (city: ActiveCity) => {
    if (!brands[city]) return
    setActiveCityState(city)
    try {
      localStorage.setItem("crm_active_city", city)
    } catch (e) {
      console.error("Failed to write localStorage crm_active_city", e)
    }
  }

  const activeBrand = brands[activeCity]

  return (
    <BrandContext.Provider value={{ activeCity, activeBrand, setActiveCity, isReady }}>
      <div className={activeBrand.themeClass}>
        {children}
      </div>
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider")
  }
  return context
}
