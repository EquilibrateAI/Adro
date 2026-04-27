/**
 * useChartResize — fixes ECharts rendering in Tauri
 *
 * Root cause: Tauri's WebView compositor commits the final window dimensions
 * AFTER the React tree mounts. ECharts reads clientWidth/clientHeight at
 * mount time and gets 0 (or a wrong size). Minimize/maximize fixes it
 * because a native resize event fires and ECharts reflows.
 *
 * Solution:
 *  1. Watch the container with ResizeObserver.
 *  2. Only set `isMounted = true` once the container has real dimensions.
 *  3. After mount, call echartsInstance.resize() in the next animation frame
 *     so ECharts recalculates with the correct pixel dimensions.
 *  4. Also call resize whenever the container box changes (panel splits, etc.)
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface UseChartResizeOptions {
  /** Minimum width (px) to consider the container "ready". Default: 10 */
  minWidth?: number;
  /** Minimum height (px) to consider the container "ready". Default: 10 */
  minHeight?: number;
  /**
   * Extra delay (ms) after the container reaches its target size before
   * marking ready. Helps on very slow machines. Default: 0
   */
  settleDelay?: number;
}

interface UseChartResizeReturn {
  /** Attach this ref to the wrapping <div> that contains ReactECharts */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /**
   * True once the container has real dimensions — only render
   * <ReactECharts> when this is true.
   */
  isMounted: boolean;
  /**
   * Pass this as the `onChartReady` prop to <ReactECharts>.
   * It stores the instance and immediately triggers a resize.
   */
  onChartReady: (instance: echarts.ECharts) => void;
}

// We import only the type from echarts to avoid loading the full bundle here
// The actual echarts instance is provided at runtime by echarts-for-react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsInstance = any;

export function useChartResize(
  options: UseChartResizeOptions = {}
): UseChartResizeReturn {
  const { minWidth = 10, minHeight = 10, settleDelay = 0 } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const echartsInstanceRef = useRef<EChartsInstance | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Trigger a resize on the stored ECharts instance
  const triggerResize = useCallback(() => {
    const instance = echartsInstanceRef.current;
    if (!instance || instance.isDisposed()) return;
    // Use rAF to ensure the browser has finished layout before measuring
    requestAnimationFrame(() => {
      try {
        instance.resize();
      } catch {
        // instance may have been disposed between frames
      }
    });
  }, []);

  // Called by <ReactECharts onChartReady={...}>
  const onChartReady = useCallback(
    (instance: EChartsInstance) => {
      echartsInstanceRef.current = instance;
      // Immediately resize in the next frame after ECharts mounts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          triggerResize();
        });
      });
    },
    [triggerResize]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        if (width >= minWidth && height >= minHeight) {
          // Container has real dimensions — schedule mount (with optional settle delay)
          if (settleTimerRef.current) clearTimeout(settleTimerRef.current);

          if (settleDelay > 0) {
            settleTimerRef.current = setTimeout(() => {
              setIsMounted(true);
              triggerResize();
            }, settleDelay);
          } else {
            setIsMounted(true);
            triggerResize();
          }
        }
      }
    });

    observer.observe(container);

    // Also listen for the native window resize event as a safety net
    const handleWindowResize = () => triggerResize();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, [minWidth, minHeight, settleDelay, triggerResize]);

  return { containerRef, isMounted, onChartReady };
}
