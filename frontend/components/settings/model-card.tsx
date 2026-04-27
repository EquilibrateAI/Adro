"use client";

import { useState, useEffect } from "react";
import { Brain, Bot, Cloud, Cpu, Server, Eye, EyeOff } from "lucide-react";

import { pingSettings } from "@/services/api/settings/settings";
import { useSettingsStore } from "@/services/utils/settings/settings-store";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import ClassicLoader from "@/components/ui/loaders/loader";

export const providers = [
  {
    name: "OpenAI",
    type: "api",
    icon: Brain,
    models: ["gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o"],
  },
  {
    name: "OpenRouter",
    type: "api",
    icon: Brain,
    models: ["openrouter/hunter-alpha", "openai/gpt-5.4", "openrouter/gpt-4o-mini", "openrouter/gpt-4-turbo", "openrouter/gpt-3.5-turbo"],
  },
  {
    name: "Claude",
    type: "api",
    icon: Bot,
    models: ["claude-sonnet-4-6", "claude-4-opus", "claude-3.7-sonnet", "claude-3.5-haiku"],
  },
  {
    name: "Gemini",
    type: "api",
    icon: Cloud,
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"],
  },
  {
    name: "Groq",
    type: "api",
    icon: Cpu,
    models: ["openai/gpt-oss-120b", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    name: "Ollama",
    type: "port",
    icon: Server,
  },
  {
    name: "LM Studio",
    type: "port",
    icon: Server,
  },
  {
    name: "llama.cpp",
    type: "port",
    icon: Cpu,
  },
  {
    name: "vllm",
    type: "base-url",
    icon: Server,
  }
];

// Configuration form for selecting providers and models, allowing users to connect to AI services
export default function ModelsCard() {
  const settingsStore = useSettingsStore();
  const { syncFromBackend } = settingsStore;

  // Initialise from store so we never flash back to providers[0] (OpenAI)
  const [provider, setProvider] = useState(() => {
    if (settingsStore.selectedProvider) {
      const found = providers.find(p => p.name === settingsStore.selectedProvider);
      if (found) return found;
    }
    return providers[0];
  });
  const [apiKey, setApiKey] = useState(settingsStore.apiKey || "");
  const [model, setModel] = useState(settingsStore.selectedModel || "");
  const [port, setPort] = useState(settingsStore.port || "");
  const [baseUrl, setBaseUrl] = useState(settingsStore.baseUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Sync ALL fields atomically whenever the store changes (e.g. after syncFromBackend resolves)
  useEffect(() => {
    if (settingsStore.selectedProvider) {
      const found = providers.find(p => p.name === settingsStore.selectedProvider);
      if (found) setProvider(found);
    }
    // Always update all fields together – don't skip empty strings so old values are cleared
    setModel(settingsStore.selectedModel || "");
    setApiKey(settingsStore.apiKey || "");
    setPort(settingsStore.port || "");
    setBaseUrl(settingsStore.baseUrl || "");
  }, [settingsStore.selectedProvider, settingsStore.selectedModel, settingsStore.apiKey, settingsStore.port, settingsStore.baseUrl]);

  // Sync settings from backend only on mount to pre-fill fields.
  // We guard against overwriting a valid local store (isConnected=true) with
  // potentially stale backend data.
  useEffect(() => {
    if (!settingsStore.isConnected) {
      syncFromBackend();
    }
  }, [syncFromBackend, settingsStore.isConnected]);

  // Initiates a connection test with the selected provider and model parameters
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const msg = await pingSettings(
        apiKey,
        provider.name,
        provider.type === "port" ? port : "",
        model,
        provider.type === "base-url" ? baseUrl : ""
      );

      if (msg.valid) {
        toast.success(`${provider.name} connected successfully`);

        // Save to persistent settings store
        settingsStore.setSelectedProvider(provider.name);
        settingsStore.setSelectedModel(model);
        settingsStore.setApiKey(apiKey);
        settingsStore.setPort(port);
        settingsStore.setBaseUrl(baseUrl);
        settingsStore.setConnected(true);

        // Notify config card to refresh
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        toast.error(`${msg.modelprovider} failed to connect`);
      }

    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Connection failed");
    }
    finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      {isLoading && (
        <ClassicLoader
          fullscreen
          text="Connecting to provider..."
        />
      )}

      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Models</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PROVIDER ROW */}

          <div className="flex flex-nowrap gap-3 overflow-x-auto">
            {providers.map((p) => {
              const Icon = p.icon;

              return (
                <Button
                  key={p.name}
                  variant={provider.name === p.name ? "default" : "outline"}
                  onClick={() => {
                    setProvider(p);
                    // Security: clear all sensitive fields when switching providers.
                    // Only restore saved credentials if this is the currently-connected provider.
                    if (p.name === settingsStore.selectedProvider) {
                      setApiKey(settingsStore.apiKey || "");
                      setModel(settingsStore.selectedModel || "");
                      setPort(settingsStore.port || "");
                      setBaseUrl(settingsStore.baseUrl || "");
                    } else {
                      setApiKey("");
                      setPort("");
                      setBaseUrl("");
                      // Pre-fill model with provider's first default, not the saved one
                      setModel(p.models && p.models.length > 0 ? p.models[0] : "");
                    }
                  }}
                  className="flex gap-2"
                >
                  <Icon size={16} />
                  {p.name}
                </Button>
              );
            })}
          </div>

          {/* CLOUD PROVIDERS */}

          {provider.type === "api" && (
            <>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Model Name</Label>

                <Input
                  placeholder="Enter model name (example: gpt-4o)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </>
          )}

          {/* OLLAMA / LM STUDIO */}

          {provider.type === "local-model" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  placeholder="Enter model name (example: llama3)"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* LLAMA.CPP */}

          {provider.type === "port" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Port Number</Label>
                <Input
                  placeholder="Enter port (example: 8080)"
                  value={port}
                  onChange={(e) => setPort(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  placeholder="Enter model name (example: llama3)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)} />
              </div>

            </div>
          )}
          {/* vllm   */}
          {provider.type === "base-url" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  placeholder="Enter base URL (example: http://localhost:8000/v1)"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input
                  placeholder="Enter model name (example: llama3)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>


            </div>
          )}
          <Button onClick={handleConnect}>Connect Provider</Button>
        </CardContent>
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <ClassicLoader />
              <p className="text-sm text-muted-foreground">
                Connecting to provider...
              </p>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
