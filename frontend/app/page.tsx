"use client";

import { DataSidebar } from "@/components/data/sidebar/data-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Data } from "@/components/data/data";
import { Database } from "lucide-react";
import { NavTabs } from "@/components/nav-tabs/nav-tabs";

export default function Page() {
  return (
    <SidebarProvider>
      <DataSidebar />
      <SidebarInset>
        <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center gap-2 border-b pb-2 border-gray-200 bg-white px-6">
          <div className="flex items-center justify-between w-full ">
            <div className="flex items-center gap-4">
              <Database className="h-6 w-6 text-primary" />
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Data Explorer</h1>
                <p className="text-sm text-muted-foreground">Query & visualize data</p>
              </div>
            </div>

            <NavTabs />
          </div>
        </header>
        <div className="flex flex-1 flex-col pt-16">
          <Data />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
