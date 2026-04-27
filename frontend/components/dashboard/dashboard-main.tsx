"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, BarChart3, Layout } from "lucide-react";
import TextMode from "./text-mode/text-mode";
import Chart from "./chart/chart";
import { Dashboard } from "./dashboard/dashboard";
import { useDashboardMode } from "@/services/utils/dashboard/dashboard-mode-store";

/**
 * The core layout component orchestrating the dashboard viewing modes.
 * 
 * Uses standard shadcn/ui Tabs backed by a Zustand store (`useDashboardMode`) 
 * to persistently switch between conversational text generation, specific chart manipulation, 
 * and full dashboard metric overviews without losing state between renders.
 * 
 * @returns {React.JSX.Element} The rendered dashboard navigation and respective active view wrapper.
 */
export function DashboardMain() {

  const { dashboardTab, setDashboardTab } = useDashboardMode();
  return (
    <div className="p-6 mr-80">
      <Tabs value={dashboardTab} onValueChange={(value) => setDashboardTab(value as "text" | "chart" | "dashboard")} className="flex flex-col h-full">
        <div className="fixed top-16 left-0 right-80 z-10 bg-background pt-4 pb-2 flex justify-center">
          <TabsList className="w-[400px]">
            <TabsTrigger value="text">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Text Mode
              </div>
            </TabsTrigger>
            <TabsTrigger value="chart">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Chart
              </div>
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Dashboard
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="pt-8 h-[calc(100vh-8rem)]">
          <TabsContent value="text" className="mt-4">
            <TextMode />
          </TabsContent>

          <TabsContent value="chart" className="mt-4">
            <Chart chartId="45" />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <Dashboard dashboardId="78" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default DashboardMain;
