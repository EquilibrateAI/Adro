"use client"

import { Database, LayoutDashboard, LineChart, Settings } from "lucide-react"
import { usePathname } from "next/navigation"
import { MenuBar } from "@/components/ui/bottom-menu"

// Renders the universal navigation menu for switching between major application views
export function NavTabs() {
  const pathname = usePathname()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: Database,
      label: "Data",
      href: "/data",
    },
    {
      icon: LineChart,
      label: "Modeling",
      href: "/modeling",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
    },
  ]

  // Determines which menu item is currently active based on the browser's URL path
  const getActiveIndex = () => {
    if (pathname === "/dashboard2" || pathname.startsWith("/dashboard2/")) return 0
    if (pathname === "/data" || pathname.startsWith("/data/")) return 1
    if (pathname === "/modeling" || pathname.startsWith("/modeling/")) return 2
    if (pathname === "/settings" || pathname.startsWith("/settings/")) return 3
    return null
  }

  return (
    <div className="ml-auto">
      <MenuBar items={menuItems} activeIndex={getActiveIndex()} />
    </div>
  )
}
