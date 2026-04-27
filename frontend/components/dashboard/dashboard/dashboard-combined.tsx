/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Calendar,
  BarChart,
  FileText,
  Printer,
  Download,
  Maximize2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ChartDownloadButton } from './chart-download-button';
import { toast } from 'sonner';
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Catches any rendering error inside a chart so only that chart shows a
// placeholder instead of crashing the whole page.
interface EBState { hasError: boolean; }
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; title?: string },
  EBState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.warn("[ChartErrorBoundary] Caught chart error:", err?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full min-h-[120px] text-sm text-slate-400">
          Chart could not be rendered
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── SafeEChart wrapper ───────────────────────────────────────────────────────
// Wraps ReactECharts in the error boundary and uses a ref to prevent calling
// resize() on a disposed instance (StrictMode / fast-refresh safe).
const SafeEChart = ({ option, style }: { option: any; style?: React.CSSProperties }) => {
  const echartsRef = React.useRef<any>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleChartReady = React.useCallback((inst: any) => {
    const tryResize = () => {
      try {
        if (mountedRef.current && inst && !inst.isDisposed()) {
          inst.resize();
        }
      } catch { /* ignore */ }
    };
    requestAnimationFrame(tryResize);
    setTimeout(tryResize, 300);
    setTimeout(tryResize, 700);
  }, []);

  return (
    <ChartErrorBoundary>
      <ReactECharts
        ref={echartsRef}
        option={option}
        style={{ width: "100%", height: "100%", ...style }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
        onChartReady={handleChartReady}
      />
    </ChartErrorBoundary>
  );
};

const SequentialLoader = () => {
  const messages = [
    'Preparing dashboard...',
    'Loading data...',
    'Almost there...',
    'Please wait ⏳',
  ];
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="text-slate-500 text-sm font-medium">{messages[step]}</p>
    </div>
  );
};

interface Metric {
  title: string;
  icon: string;
  color: string;
  value: string;
  change: string;
  progressWidth: string;
  note: string;
}

interface UnifiedDashboardCardProps {
  dashboardTitle?: string;
  timeRange?: string;
  metrics?: Metric[];
  chartOptions?: any[];
  tableData?: any[];
  insights?: Array<{ title: string; description: string }>;
  isLoading?: boolean;
}

// Renders a complete dashboard overview including metrics, charts, and data tables
export default function UnifiedDashboardCard({
  dashboardTitle = 'Dashboard Overview',
  timeRange,
  metrics = [],
  chartOptions = [],
  tableData = [],
  insights = [],
  isLoading = false,
}: UnifiedDashboardCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);
  const [showLoader, setShowLoader] = React.useState(isLoading);
  const [expandedChart, setExpandedChart] = React.useState<any>(null);
  const [expandedChartTitle, setExpandedChartTitle] = React.useState<string>("");
  
  
  React.useEffect(() => {
    const handleLoading = (e: CustomEvent<boolean>) => setShowLoader(e.detail);
    window.addEventListener('dashboard-loading', handleLoading as EventListener);
    return () => window.removeEventListener('dashboard-loading', handleLoading as EventListener);
  }, []);

React.useEffect(() => {
  if (!gridRef.current) return;

  const grid = GridStack.init(
    {
      float: true,
      margin: 4,
      cellHeight: 120,
    },
    gridRef.current
  );

  // 🔥 Resize charts when widget height changes
  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const chartEl = entry.target.querySelector(".echarts-for-react");

      if (chartEl) {
        const instance = (chartEl as any).__echarts_instance__;
        instance?.resize();
      }
    });
  });

  // observe each widget content container
  gridRef.current
    .querySelectorAll(".chart-resize-container")
    .forEach((el) => resizeObserver.observe(el));

  return () => {
    resizeObserver.disconnect();
    grid.destroy(false);
  };
}, [chartOptions, metrics, insights, tableData]);

  const hasMetrics = metrics.length > 0;
  const hasCharts = chartOptions.length > 0;
  const hasTable = tableData.length > 0;
  const hasInsights = insights.length > 0;
  const hasData = hasMetrics || hasCharts || hasTable || hasInsights;
  const widgets = React.useMemo(() => {
  const list: any[] = [];

  metrics.forEach((metric, i) =>
    list.push({
      id: `metric-${i}`,
      type: "metric",
      data: metric,
    })
  );

  chartOptions.forEach((chart, i) =>
    list.push({
      id: `chart-${i}`,
      type: "chart",
      data: chart,
    })
  );

  insights.forEach((insight, i) =>
    list.push({
      id: `insight-${i}`,
      type: "insight",
      data: insight,
    })
  );

  if (tableData.length > 0) {
    list.push({
      id: "table",
      type: "table",
      data: tableData,
    });
  }

  return list.sort(() => Math.random() - 0.5);
}, [metrics, chartOptions, insights, tableData]);
  const layoutWidgets = React.useMemo(() => {
  return widgets.map((widget) => {
    let w = 3;
    let h = 1;

    if (widget.type === "chart") {
      w = 6;
      h = 4;
    }

    if (widget.type === "insight") {
      w = 4;
      h = 1;
    }

    if (widget.type === "table") {
      w = 12;
      h = 3;
    }

    return {
      ...widget,
      w,
      h,
    };
  });
}, [widgets]);

  // const tableColumns = hasTable ? Object.keys(tableData[0]) : [];

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let hasExportableData = false;

      // Export KPIs
      if (hasMetrics) {
        const kpiData = metrics.map((m) => ({
          Metric: m.title,
          Value: m.value,
          Change: m.change,
          Note: m.note,
        }));
        const kpiWs = XLSX.utils.json_to_sheet(kpiData);
        XLSX.utils.book_append_sheet(wb, kpiWs, "KPIs");
        hasExportableData = true;
      }

      // Export Table Data
      if (hasTable) {
        const tableWs = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(wb, tableWs, "Data Table");
        hasExportableData = true;
      }

      // Export Insights
      if (hasInsights) {
        const insightData = insights.map((i) => ({
          Title: i.title,
          Description: i.description || "",
        }));
        const insightWs = XLSX.utils.json_to_sheet(insightData);
        XLSX.utils.book_append_sheet(wb, insightWs, "Insights");
        hasExportableData = true;
      }

      if (!hasExportableData) {
        toast.error("No data available to export");
        return;
      }

      const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      XLSX.writeFile(wb, `${dashboardTitle.replace(/\s+/g, '-')}-${ts}.xlsx`);
      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export as Excel.");
    }
  };

  const handleDownload = async (format: 'jpeg' | 'png' | 'pdf' | 'print' | 'excel') => {
    if (format === 'excel') {
      exportToExcel();
      setShowDownloadMenu(false);
      return;
    }

    if (!cardRef.current) return;

    setIsExporting(true);
    setShowDownloadMenu(false);

    try {
      switch (format) {
        case 'jpeg':
        case 'png': {
          const dataUrl = format === 'png'
            ? await htmlToImage.toPng(cardRef.current, {
              quality: 0.95,
              backgroundColor: '#ffffff',
              pixelRatio: 2,
            })
            : await htmlToImage.toJpeg(cardRef.current, {
              quality: 0.95,
              backgroundColor: '#ffffff',
              pixelRatio: 2,
            });

          const blob = await (await fetch(dataUrl)).blob();
          const filename = `${dashboardTitle.replace(/\s+/g, '-')}-${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;

          downloadFile(blob, filename);
          toast.success(`${format.toUpperCase()} downloaded successfully!`);
          break;
        }

        case 'pdf': {
          const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
          });

          const padding = 10;
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const contentWidth = pdfWidth - (padding * 2);

          const canvas = await htmlToImage.toCanvas(cardRef.current, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;

          // First page
          pdf.addImage(imgData, 'JPEG', padding, padding, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - padding * 2);

          // Subsequent pages if content exceeds one page
          while (heightLeft > 0) {
            position = heightLeft - imgHeight + padding;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', padding, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - padding * 2);
          }

          pdf.save(`${dashboardTitle.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
          toast.success("PDF downloaded successfully!");
          break;
        }

        case 'print': {
          const dataUrl = await htmlToImage.toJpeg(cardRef.current, {
            quality: 0.95,
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });

          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert('Please allow popups to print');
            break;
          }

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${dashboardTitle}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: sans-serif; padding: 20px; }
                img { width: 100%; border-radius: 8px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              <div class="header"><h1>${dashboardTitle}</h1></div>
              <img src="${dataUrl}" />
              <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">Print Now</button>
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
          break;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ─── helpers ────────────────────────────────────────────────────────────────

  /** Safely format a numeric axis tick without throwing on null/undefined */
  const formatNumber = (value: any): string | number => {
    const n = Number(value);
    if (isNaN(n)) return String(value ?? "");
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n;
  };

  /**
   * Normalise a raw yAxis / xAxis value coming from the AI so it is always
   * an **array** of axis-objects (ECharts' multi-axis format).
   * This prevents the "yAxis '0' not found" crash when the AI returns an
   * array but we spread it as a plain object.
   */
  const normaliseAxis = (axis: any, extraProps: Record<string, any> = {}): any[] => {
    if (!axis) return [{ ...extraProps }];
    const arr = Array.isArray(axis) ? axis : [axis];
    // Apply extraProps only to the first axis entry so we don't break multi-axis charts
    return arr.map((a, i) =>
      i === 0 ? { ...(typeof a === "object" && a !== null ? a : {}), ...extraProps } : a
    );
  };

  /** Safely build a chart option that will never crash ECharts */
  const buildSafeOption = (option: any): any | null => {
    if (!option || typeof option !== "object") return null;

    try {
      const titleOption = Array.isArray(option.title) ? option.title[0] : option.title;
      const isPieChart = Array.isArray(option.series) && option.series.some((s: any) => s?.type === "pie");
      const isScatterChart = Array.isArray(option.series) && option.series.some((s: any) => s?.type === "scatter");
      const isHeatmap = Array.isArray(option.series) && option.series.some((s: any) => s?.type === "heatmap");
      // Charts that do NOT use cartesian axes
      const isCartesian = !isPieChart && !isScatterChart;

      const safeSeries = Array.isArray(option.series)
        ? option.series.map((s: any) => {
            if (!s || typeof s !== "object") return s;
            return {
              ...s,
              label: {
                ...(s.label || {}),
                show: true,
                position: isPieChart ? "inside" : "top",
                formatter: (params: any) => {
                  try {
                    const v = Array.isArray(params?.value) ? params.value[1] : params?.value;
                    return formatNumber(v);
                  } catch {
                    return "";
                  }
                },
              },
            };
          })
        : option.series;

      const base: any = {
        ...option,
        title: titleOption && typeof titleOption === "object"
          ? { ...titleOption, show: false }
          : { show: false },
        series: safeSeries,
        legend: { ...(option.legend || {}), top: 5 },
        grid: option.grid ?? {
          top: option.legend ? 60 : 20,
          left: 40,
          right: 20,
          bottom: 40,
          containLabel: true,
        },
        tooltip: {
          ...(option.tooltip || {}),
          trigger: option.tooltip?.trigger ?? (isPieChart ? "item" : "axis"),
          formatter: (params: any) => {
            try {
              const p = Array.isArray(params) ? params[0] : params;
              if (!p) return "";
              const val = Array.isArray(p.value) ? p.value[1] : p.value;
              return `${p.name ?? ""}<br/>${p.marker ?? ""}${p.seriesName ?? ""} <b>${formatNumber(val)}</b>`;
            } catch {
              return "";
            }
          },
        },
      };

      if (isCartesian) {
        base.xAxis = normaliseAxis(option.xAxis, {
          axisLabel: {
            formatter: (value: string) => {
              try {
                const s = String(value ?? "");
                return s.length > 12 ? s.slice(0, 12) + "…" : s;
              } catch {
                return "";
              }
            },
          },
        });

        base.yAxis = normaliseAxis(option.yAxis, {
          axisLabel: {
            formatter: (value: any) => {
              try {
                return formatNumber(value);
              } catch {
                return "";
              }
            },
          },
        });
      }

      // Heatmap / visualMap — leave axis as-is but still normalise
      if (isHeatmap) {
        base.xAxis = normaliseAxis(option.xAxis);
        base.yAxis = normaliseAxis(option.yAxis);
      }

      return base;
    } catch (e) {
      console.warn("buildSafeOption: failed to build chart option", e);
      return null;
    }
  };

  const renderChart = (option: any, idx: number) => {
    // Safely extract a display title from whatever the AI returned
    const extractText = (val: any): string => {
      try {
        if (typeof val === "string") return val;
        if (!val) return "";
        if (typeof val === "object") {
          if ("text" in val) return extractText(val.text);
          if (val.label) return extractText(val.label);
          if (val.title) return extractText(val.title);
          return "";
        }
        return String(val);
      } catch {
        return "";
      }
    };

    const titleOption = Array.isArray(option?.title) ? option.title[0] : option?.title;
    const chartTitle = extractText(titleOption) || `Chart ${idx + 1}`;
    const fixedOption = buildSafeOption(option);

    // If we couldn't build a valid option, show a graceful placeholder
    if (!fixedOption) {
      return (
        <Card key={idx} className="shadow-sm chart-container relative group h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-base font-semibold text-slate-800">{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-center h-full">
            <p className="text-sm text-slate-400">Chart data unavailable</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={idx} className="shadow-sm chart-container relative group h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-base font-semibold text-slate-800">{chartTitle}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100"
              onClick={() => {
                setExpandedChart(fixedOption);
                setExpandedChartTitle(chartTitle);
              }}
              title="Expand chart"
            >
              <Maximize2 className="w-4 h-4 text-slate-600" />
            </Button>
            <ChartDownloadButton
              chartOption={fixedOption}
              chartTitle={chartTitle}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-1 h-full">
          <div className="w-full h-full">
            <SafeEChart option={fixedOption} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full h-full p-0 font-roboto">
      <Card className="w-full shadow-2xl bg-white overflow-hidden">
        <CardHeader className="border-b bg-white px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 shadow-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  {(() => {
                    if (dashboardTitle !== "Dashboard Overview") return dashboardTitle;

                    const hasOnlyCharts = hasCharts && !hasTable && !hasMetrics;
                    const hasOnlyTable = hasTable && !hasCharts && !hasMetrics;

                    if (hasOnlyCharts) return "Chart Analysis";
                    if (hasOnlyTable) return "Data Table";

                    return "Dashboard Overview";
                  })()}
                </CardTitle>
                <p className="text-sm text-slate-600">Complete Overview</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {timeRange && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                  <Calendar className="w-3 h-3 mr-1" />
                  {timeRange}
                </Badge>
              )}

              <div className="relative">
                <Button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={isExporting || !hasData}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  {isExporting ? (
                    <>
                      <Download className="w-4 h-4 mr-2 animate-bounce" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>

                {showDownloadMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-50 bg-transparent"
                      onClick={() => setShowDownloadMenu(false)}
                    />
                    <div className="fixed right-4 top-20 w-80 bg-white rounded-2xl shadow-2xl border z-[60] overflow-hidden">
                      <div className="p-4 border-b bg-slate-50">
                        <div className="text-base font-semibold text-slate-800">Export Dashboard</div>
                        <div className="text-sm text-slate-500 mt-1">Choose your export format</div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => handleDownload('jpeg')}
                          className="flex items-center w-full px-4 py-2.5 rounded-lg transition-colors hover:bg-blue-50"
                        >
                          <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-left font-medium text-slate-800 text-sm">Download as JPEG</div>
                        </button>

                        <button
                          onClick={() => handleDownload('png')}
                          className="flex items-center w-full px-4 py-2.5 rounded-lg transition-colors hover:bg-purple-50"
                        >
                          <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="text-left font-medium text-slate-800 text-sm">Download as PNG</div>
                        </button>

                        <button
                          onClick={() => handleDownload('pdf')}
                          className="flex items-center w-full px-4 py-2.5 rounded-lg transition-colors hover:bg-red-50"
                        >
                          <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                            <FileText className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="text-left font-medium text-slate-800 text-sm">Download as PDF</div>
                        </button>

                        <button
                          onClick={() => handleDownload('excel')}
                          className="flex items-center w-full px-4 py-2.5 rounded-lg transition-colors hover:bg-green-50"
                        >
                          <div className="p-1.5 bg-green-100 rounded-lg mr-3">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="text-left font-medium text-slate-800 text-sm">Download as Excel</div>
                        </button>

                        <div className="h-px bg-slate-200 my-2"></div>

                        <button
                          onClick={() => handleDownload('print')}
                          className="flex items-center w-full px-4 py-2.5 rounded-lg transition-colors hover:bg-gray-50"
                        >
                          <div className="p-1.5 bg-gray-100 rounded-lg mr-3">
                            <Printer className="w-4 h-4 text-gray-700" />
                          </div>
                          <div className="text-left font-medium text-slate-800 text-sm">Print</div>
                        </button>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border-t text-right">
                        <button onClick={() => setShowDownloadMenu(false)} className="text-xs font-semibold text-indigo-600">Close</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent ref={cardRef} className="p-6">
          {showLoader ? (
            <div className="min-h-[600px] flex items-center justify-center">
              <SequentialLoader />
            </div>
          ) : !hasData ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
              <div className="p-4 rounded-full bg-slate-200 mb-4">
                <BarChart className="w-12 h-12" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No Dashboard Data Available</p>
              <p className="text-xs text-slate-500">Generate a dashboard to see all components</p>
            </div>
          ) : (
           <div className="grid-stack" ref={gridRef}>
  {layoutWidgets.map((widget) => (
    <div
      key={widget.id}
      className="grid-stack-item"
      gs-w={widget.w}
      gs-h={widget.h}
      gs-auto-position="true"
      data-widget-type={widget.type}
    >
      <div className="grid-stack-item-content h-full p-2">

        {/* KPI */}
        {widget.type === "metric" && (
 <Card className="h-full shadow-sm px-4 py-2 flex flex-col justify-center overflow-hidden">
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-600 font-medium truncate">
      {widget.data.title}
    </span>

    <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center">
      <span>{widget.data.icon}</span>
    </div>
  </div>

  <div className="text-md font-semibold text-black mt-1">
    {widget.data.value}
  </div>
</Card>
        )}

        {/* CHART */}
        {widget.type === "chart" &&
          renderChart(widget.data, 0)}

        {/* INSIGHT */}
        {widget.type === "insight" && (
          <Card className="shadow-sm border-l-4 border-l-indigo-500 h-full">
            <CardContent className="p-2 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {widget.data.title}
              </p>

              {widget.data.description && (
                <p className="text-xs text-slate-600 mt-2">
                  {widget.data.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* TABLE */}
        {widget.type === "table" && (
        <div className="overflow-auto border rounded-xl shadow-sm h-full max-h-full">
       <ScrollArea className="flex-1 h-full"  >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  {Object.keys(widget.data[0]).map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase"
                    >
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {widget.data.map((row: any, idx: number) => (
                  <tr key={idx}>
                    {Object.values(row).map((cell: any, i: number) => (
                      <td
                        key={i}
                        className="px-6 py-4 text-sm text-slate-700"
                      >
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </ScrollArea>
          </div>
        )}

      </div>
    </div>
  ))}
</div>
          )}
        </CardContent>
      </Card>

      {/* Chart Expand Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full h-full max-w-[1400px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b">
              <h2 className="text-2xl font-bold text-slate-800">{expandedChartTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-slate-100 rounded-full"
                onClick={() => setExpandedChart(null)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1 p-8">
              {expandedChart && typeof expandedChart === "object" && (
                <SafeEChart option={expandedChart} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
