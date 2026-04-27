"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/services/utils/settings/settings-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Server, Brain, Bot, Cloud, Cpu, type LucideIcon } from "lucide-react";

const providerIcons: Record<string, LucideIcon> = {
  OpenAI: Brain,
  Claude: Bot,
  Gemini: Cloud,
  Groq: Cpu,
  Ollama: Server,
  "LM Studio": Server,
  "llama.cpp": Cpu,
  vllm:Server,
};

// Displays the currently active model configuration and its connection status
export default function ConfigCard() {
  const { selectedProvider, selectedModel, port,baseUrl, isConnected, syncFromBackend } = useSettingsStore();

  // Sync settings from backend on mount (silent sync)
  useEffect(() => {
    syncFromBackend();
  }, [syncFromBackend]);

  const Icon = providerIcons[selectedProvider] || Brain;

  // We only show "No model configured" if we definitely don't have a provider selected in the store.
  // Since the store is persisted, this survives navigation.
  if (!selectedProvider) {
    return (
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No model configured yet. Select a provider and connect above to see status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Current Configuration
          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
            <CheckCircle className="w-3 h-3" />
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Provider
            </p>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-slate-600" />
              <p className="text-sm font-semibold text-slate-800">
                {selectedProvider}
              </p>
            </div>
          </div>

          <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Model
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {selectedModel || "—"}
            </p>
          </div>

         {["ollama", "LM Studio", "llama.cpp"].includes(selectedProvider) && port && (
  <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Port
    </p>
    <p className="text-sm font-semibold text-slate-800">{port}</p>
  </div>
)}
{selectedProvider === "vllm" && baseUrl && (
  <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Base URL
    </p>
    <p className="text-sm font-semibold text-slate-800">
      {baseUrl}
    </p>
  </div>
)}

          <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </p>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <p className={`text-sm font-semibold ${isConnected ? "text-green-600" : "text-gray-500"}`}>
                {isConnected ? "Active" : "Disconnected"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
