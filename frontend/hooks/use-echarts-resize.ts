/**
 * useEChartsResize
 *
 * The simplest reliable fix for ECharts rendering compressed/wrong in Tauri:
 *
 * Root cause: Tauri's WebView reports clientWidth=0 when ECharts first mounts
 * because the OS window compositor hasn't committed final dimensions yet.
 * A native resize event (from minimise/maximise) fixes it because ECharts
 * calls instance.resize() in its own resize handler.
 *
 * Fix: give ECharts the instance as soon as it's ready, then call resize()
 * in three ways to guarantee it fires after layout settles:
 *   1. Immediately in onChartReady (catches cases where layout is already done)
 *   2. After one rAF (next paint)
 *   3. After 300ms timeout (catches slow Tauri WebView initialisation)
 *
 * Usage:
 *   const { onChartReady } = useEChartsResize();
 *   <ReactECharts onChartReady={onChartReady} ... />
 */

import { useRef, useCallback, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsInstance = any;

export function useEChartsResize() {
  const instanceRef = useRef<EChartsInstance | null>(null);

  const doResize = useCallback(() => {
    const inst = instanceRef.current;
    if (!inst || inst.isDisposed?.()) return;
    try { inst.resize(); } catch { /* disposed between frames */ }
  }, []);

  const onChartReady = useCallback((instance: EChartsInstance) => {
    instanceRef.current = instance;
    // 1. Immediate
    doResize();
    // 2. Next paint
    requestAnimationFrame(doResize);
    // 3. After Tauri WebView settles (300ms is enough on all tested machines)
    setTimeout(doResize, 300);
    // 4. Extra safety at 600ms for very slow cold starts
    setTimeout(doResize, 600);
  }, [doResize]);

  // Also respond to real window resize events (panel splits, window drag)
  useEffect(() => {
    const handler = () => doResize();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [doResize]);

  return { onChartReady };
}
