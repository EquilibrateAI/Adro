"use client"

import SidebarRight from "@/components/dashboard/sidebar/dashboard-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import DashboardMain from "@/components/dashboard/dashboard-main"
import { LayoutDashboard } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { NavTabs } from "@/components/nav-tabs/nav-tabs"

export default function Page() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center gap-2 border-b pb-2 border-gray-200 bg-white px-6">
          <div className="flex items-center justify-end w-full ">
            <div className="flex items-center gap-4">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Overview and performance analytics</p>
              </div>
            </div>

            <NavTabs />
          </div>

        </header>

        <main className="pt-16">
          <DashboardMain />
        </main>
      </SidebarInset>

      <SidebarRight />
    </SidebarProvider>
  )
}