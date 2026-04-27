"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

// This component handles showing a full-page loader during route transitions
export  function RouteLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Handle link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]')
      
      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href && href.startsWith('/') && !href.startsWith('#') && href !== pathname) {
          e.preventDefault()
          setLoading(true)
          
          // Small delay to ensure spinner renders before navigation
          setTimeout(() => {
            window.location.href = href
          }, 0)
        }
      }
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [pathname])

  useEffect(() => {
    // Initial load
    const timeout = setTimeout(() => setLoading(false), 0)
    return () => clearTimeout(timeout)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-background">
        <div id="wifi-loader">
          <svg className="circle-outer" viewBox="0 0 86 86">
            <circle className="back" cx="43" cy="43" r="40" />
            <circle className="front" cx="43" cy="43" r="40" />
          </svg>
          <svg className="circle-middle" viewBox="0 0 60 60">
            <circle className="back" cx="30" cy="30" r="27" />
            <circle className="front" cx="30" cy="30" r="27" />
          </svg>
          <svg className="circle-inner" viewBox="0 0 34 34">
            <circle className="back" cx="17" cy="17" r="14" />
            <circle className="front" cx="17" cy="17" r="14" />
          </svg>
          <div className="text" data-text="Loading"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}