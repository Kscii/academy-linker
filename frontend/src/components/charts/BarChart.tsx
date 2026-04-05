// ============================================================
// BarChart — Canvas-based vertical bar chart
// Used in dashboard subject overview and teacher class cards
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import type { ChartDataPoint } from '@/types/api';

interface BarChartProps {
  data: ChartDataPoint[];
  colors?: string[];
  height?: number;
  showAvg?: boolean;
  mini?: boolean; // compact mode for class cards
}

const DEFAULT_COLORS = ['#E8614E', '#3DB6A8', '#4A90D9', '#F0A732', '#8B5CF6', '#E91E8C'];

// Ease-out cubic
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function BarChart({
  data,
  colors = DEFAULT_COLORS,
  height = 180,
  showAvg = false,
  mini = false,
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback((progress = 1) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padTop = mini ? 8 : 16;
    const padBottom = mini ? 16 : 28;
    const padLeft = mini ? 4 : 36;
    const padRight = mini ? 4 : 8;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const allVals = [
      ...data.map(d => d.value),
      ...(showAvg ? data.map(d => d.avg ?? 0) : []),
    ];
    const maxVal = Math.min(100, Math.max(...allVals) + 10);
    const minVal = 0;
    const range = maxVal - minVal;

    const style = getComputedStyle(document.documentElement);
    const gridColor = style.getPropertyValue('--bd').trim() || 'rgba(0,0,0,0.08)';
    const labelColor = style.getPropertyValue('--tx3').trim() || '#B8A8C8';

    // Grid lines
    if (!mini) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (i / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();
      }

      // Y axis labels
      ctx.fillStyle = labelColor;
      ctx.font = '10px Nunito, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round(maxVal - (i / 4) * range);
        const y = padTop + (i / 4) * chartH;
        ctx.fillText(`${val}`, padLeft - 4, y + 3);
      }
    }

    const barGroupW = chartW / data.length;
    const barW = showAvg ? barGroupW * 0.35 : barGroupW * 0.55;
    const barGap = showAvg ? barGroupW * 0.05 : 0;

    data.forEach((d, i) => {
      const barColor = colors[i % colors.length];
      const x = padLeft + i * barGroupW + (barGroupW - barW * (showAvg ? 2 : 1) - barGap) / 2;
      const fullBarH = ((d.value - minVal) / range) * chartH;
      const barH = fullBarH * progress;
      const y = padTop + chartH - barH;

      // Main bar
      const r = mini ? 2 : Math.min(5, barH / 2);
      if (barH > 0) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fillStyle = barColor;
        ctx.fill();
      }

      // Class avg bar
      if (showAvg && d.avg !== undefined) {
        const ax = x + barW + barGap;
        const fullAH = ((d.avg - minVal) / range) * chartH;
        const aH = fullAH * progress;
        const ay = padTop + chartH - aH;
        if (aH > 0) {
          const ar = Math.min(5, aH / 2);
          ctx.beginPath();
          ctx.moveTo(ax + ar, ay);
          ctx.lineTo(ax + barW - ar, ay);
          ctx.quadraticCurveTo(ax + barW, ay, ax + barW, ay + ar);
          ctx.lineTo(ax + barW, ay + aH);
          ctx.lineTo(ax, ay + aH);
          ctx.lineTo(ax, ay + ar);
          ctx.quadraticCurveTo(ax, ay, ax + ar, ay);
          ctx.fillStyle = barColor + '55';
          ctx.fill();
        }
      }

      // X-axis label
      if (!mini) {
        ctx.fillStyle = labelColor;
        ctx.font = '10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, padLeft + i * barGroupW + barGroupW / 2, h - 6);
      }

      // Value label on top of bar
      if (!mini && barH > 20) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${d.value}`, x + barW / 2, y + 13);
      }
    });
  }, [data, colors, height, showAvg, mini]);

  // Entrance animation on mount / data change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    const duration = 600; // ms
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      draw(easeOut(t));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize: redraw at full progress without animation
  useEffect(() => {
    const ro = new ResizeObserver(() => draw(1));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="chart-container">
      <canvas ref={canvasRef} className="chart-canvas" style={{ height }} />
    </div>
  );
}
