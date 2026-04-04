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

export function BarChart({
  data,
  colors = DEFAULT_COLORS,
  height = 180,
  showAvg = false,
  mini = false,
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
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
      const barH = ((d.value - minVal) / range) * chartH;
      const y = padTop + chartH - barH;

      // Main bar
      const r = mini ? 2 : 5;
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

      // Class avg bar
      if (showAvg && d.avg !== undefined) {
        const ax = x + barW + barGap;
        const aH = ((d.avg - minVal) / range) * chartH;
        const ay = padTop + chartH - aH;
        ctx.beginPath();
        ctx.moveTo(ax + r, ay);
        ctx.lineTo(ax + barW - r, ay);
        ctx.quadraticCurveTo(ax + barW, ay, ax + barW, ay + r);
        ctx.lineTo(ax + barW, ay + aH);
        ctx.lineTo(ax, ay + aH);
        ctx.lineTo(ax, ay + r);
        ctx.quadraticCurveTo(ax, ay, ax + r, ay);
        ctx.fillStyle = barColor + '55';
        ctx.fill();
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

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="chart-container">
      <canvas ref={canvasRef} className="chart-canvas" style={{ height }} />
    </div>
  );
}
