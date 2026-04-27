 
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useEffect, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Button } from "@/components/ui/button";
import { DownloadCloud, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import * as htmlToImage from "html-to-image";

interface ChartDownloadButtonProps {
  chartOption: any;
  chartTitle: string;
}

// ─── tiny error boundary so a bad chartOption never crashes the page ─────────
interface EBState { hasError: boolean }
class DownloadChartBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.warn("[ChartDownloadButton] caught render error:", err?.message);
  }
  render() {
    if (this.state.hasError) return null; // silent – download button just disappears
    return this.props.children;
  }
}

// A button component that provides options to download charts as images
export const ChartDownloadButton = ({ chartOption, chartTitle }: ChartDownloadButtonProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const echartRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Track mount state so async callbacks don't run after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const downloadChart = useCallback(async (format: string) => {
    if (!chartRef.current) return;

    try {
      let dataUrl: string;

      if (format === "png" || format === "jpg") {
        // Try to get the rendered canvas directly from the ECharts instance first
        let usedEcharts = false;
        try {
          const ecInst = echartRef.current?.getEchartsInstance?.();
          if (ecInst && !ecInst.isDisposed()) {
            const canvas = ecInst.getRenderedCanvas({
              backgroundColor: "#fff",
              pixelRatio: 2,
            });
            dataUrl = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", 0.95);
            usedEcharts = true;
          }
        } catch {
          // fall through to html-to-image
        }

        if (!usedEcharts) {
          dataUrl = format === "png"
            ? await htmlToImage.toPng(chartRef.current, {
              backgroundColor: "#ffffff",
              pixelRatio: 2,
              cacheBust: true,
            })
            : await htmlToImage.toJpeg(chartRef.current, {
              backgroundColor: "#ffffff",
              pixelRatio: 2,
              quality: 0.95,
              cacheBust: true,
            });
        }

        if (!mountedRef.current) return;

        const link = document.createElement("a");
        link.download = `${chartTitle || "chart"}.${format}`;
        link.href = dataUrl!;
        link.click();
        toast.success(`Chart downloaded as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed. Please try again.");
    }

    setShowMenu(false);
  }, [chartTitle]);

  // Only render the hidden ECharts instance if the option looks valid
  const hasValidOption =
    chartOption &&
    typeof chartOption === "object" &&
    Array.isArray(chartOption.series) &&
    chartOption.series.length > 0;

  return (
    <DownloadChartBoundary>
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-slate-100"
          onClick={() => setShowMenu(!showMenu)}
          title="Download options"
        >
          <DownloadCloud className="w-4 h-4 text-slate-600" />
        </Button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => downloadChart("png")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  type="button"
                >
                  <ImageIcon className="w-4 h-4" />
                  Download as PNG
                </button>
                <button
                  onClick={() => downloadChart("jpg")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  type="button"
                >
                  <ImageIcon className="w-4 h-4" />
                  Download as JPG
                </button>
              </div>
            </div>
          </>
        )}

        {/* Hidden high-quality capture container – only mounted when option is valid */}
        {hasValidOption && (
          <div
            ref={chartRef}
            className="absolute -left-[9999px] top-0 w-[800px] h-[400px] bg-white p-4"
            aria-hidden="true"
          >
            <DownloadChartBoundary>
              <ReactECharts
                ref={echartRef}
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge={true}
              />
            </DownloadChartBoundary>
          </div>
        )}
      </div>
    </DownloadChartBoundary>
  );
};
