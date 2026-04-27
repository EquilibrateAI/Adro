"use client";

import Image from "next/image";
import { Sidebar } from "@/components/ui/column-info-sidebar";
import { AIAssistantInterface } from "@/components/ui/ai-assistant-interface";
import { NavTabs } from "@/components/nav-tabs/nav-tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function Dashboard2Page() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Main Content Area - Full width container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Full width at top */}
        <header className="h-16 flex-shrink-0 border-b border-gray-200 bg-white px-6 flex items-center">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo.png" className="rounded-full object-contain" alt="Logo" width={42} height={42} />
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  Ask questions and generate insights
                </p>
              </div>
            </div>

            <NavTabs />
          </div>
        </header>

        {/* Main content area with Sidebar and AI Assistant */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar positioned below navbar */}
          <div className="h-full bg-white flex flex-col shadow-xl border-r border-slate-200 z-30 min-w-0 overflow-hidden">
            <Sidebar selectedFiles={selectedFiles} />
          </div>

          {/* AI Assistant Interface */}
          <div className="flex-1 overflow-hidden">
            <AIAssistantInterface onSelectedFilesChange={setSelectedFiles} />
          </div>
        </div>
      </div>
    </div>
  );
}