// ============================================================
// LineChart — Canvas-based line chart with hover tooltip
// Props: data points, optional class avg overlay, color, period
// ============================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ChartDataPoint } from '@/types/api';

interface LineChartProps {
  data: ChartDataPoint[];
  avgData?: ChartDataPoint[];
  color?: string;
  avgColor?: string;
  showAvg?: boolean;
  height?: number;
  label?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  value: number;
  avg?: number;
  label: string;
}

// Resolve CSS variables like "var(--a1)" to actual color values for canvas use
function resolveColor(color: string): string {
  if (color.startsWith('var(')) {
    const name = color.slice(4, -1).trim();
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
  }
  return color;
}

// Ease-out cubic
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function LineChart({
  data,
  avgData,
  color = '#E8614E',
  avgColor = '#3DB6A8',
  showAvg = false,
  height = 180,
  label,
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, value: 0, label: '',
  });

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

    // Padding
    const padTop = 16;
    const padBottom = 28;
    const padLeft = 36;
    const padRight = 16;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Value range
    const allValues = [
      ...data.map(d => d.value),
      ...(showAvg && avgData ? avgData.map(d => d.value) : []),
    ];
    const minVal = Math.max(0, Math.min(...allValues) - 10);
    const maxVal = Math.min(100, Math.max(...allValues) + 10);
    const range = maxVal - minVal || 1;

    const toX = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
    const toY = (v: number) => padTop + chartH - ((v - minVal) / range) * chartH;

    // Read CSS variable colours for grid lines & labels
    const style = getComputedStyle(document.documentElement);
    const gridColor = style.getPropertyValue('--bd').trim() || 'rgba(0,0,0,0.08)';
    const labelColor = style.getPropertyValue('--tx3').trim() || '#B8A8C8';

    // Horizontal grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = labelColor;
    ctx.font = '10px Nunito, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(minVal + ((4 - i) / 4) * range);
      const y = padTop + (i / 4) * chartH;
      ctx.fillText(`${val}`, padLeft - 6, y + 3);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = toX(i);
      ctx.fillStyle = labelColor;
      ctx.fillText(d.label, x, h - 6);
    });

    // Clip to animated region (left→right reveal)
    const clipW = padLeft + chartW * progress;
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, 0, clipW - padLeft, h);
    ctx.clip();

    // Draw line helper
    const drawLine = (points: number[][], lineColor: string, dashed = false) => {
      if (points.length < 2) return;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
      grad.addColorStop(0, lineColor + '33');
      grad.addColorStop(1, lineColor + '00');

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const cp1x = (points[i - 1][0] + points[i][0]) / 2;
        const cp1y = points[i - 1][1];
        const cp2x = (points[i - 1][0] + points[i][0]) / 2;
        const cp2y = points[i][1];
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i][0], points[i][1]);
      }
      ctx.lineTo(points[points.length - 1][0], padTop + chartH);
      ctx.lineTo(points[0][0], padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      if (dashed) ctx.setLineDash([5, 4]);
      else ctx.setLineDash([]);
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const cp1x = (points[i - 1][0] + points[i][0]) / 2;
        const cp1y = points[i - 1][1];
        const cp2x = (points[i - 1][0] + points[i][0]) / 2;
        const cp2y = points[i][1];
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i][0], points[i][1]);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Resolve CSS variables to actual hex/rgb values for canvas
    const resolvedColor = resolveColor(color);
    const resolvedAvgColor = resolveColor(avgColor);

    // Main data line
    const mainPoints = data.map((d, i) => [toX(i), toY(d.value)]);
    drawLine(mainPoints, resolvedColor);

    // Class average overlay
    if (showAvg && avgData && avgData.length > 0) {
      const avgPoints = avgData.map((d, i) => [toX(i), toY(d.value)]);
      drawLine(avgPoints, resolvedAvgColor, true);
    }

    // Dots on main line — only show dots that fall within clipped region
    data.forEach((d, i) => {
      const x = toX(i);
      if (x > clipW) return;
      const y = toY(d.value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  }, [data, avgData, color, avgColor, showAvg, height]);

  // Entrance animation on mount / data change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    const duration = 700; // ms
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const padLeft = 36;
    const padRight = 16;
    const chartW = container.clientWidth - padLeft - padRight;

    // Find closest data point
    let closest = 0;
    let minDist = Infinity;
    data.forEach((_, i) => {
      const x = padLeft + (i / (data.length - 1)) * chartW;
      const dist = Math.abs(mouseX - x);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });

    if (minDist < 30) {
      const d = data[closest];
      const x = padLeft + (closest / (data.length - 1)) * chartW;
      const padTop = 16;
      const padBottom = 28;
      const chartH = height - padTop - padBottom;
      const allVals = data.map(v => v.value);
      const minVal = Math.max(0, Math.min(...allVals) - 10);
      const maxVal = Math.min(100, Math.max(...allVals) + 10);
      const range = maxVal - minVal || 1;
      const y = padTop + chartH - ((d.value - minVal) / range) * chartH;

      setTooltip({
        visible: true,
        x,
        y,
        value: d.value,
        avg: avgData?.[closest]?.value,
        label: d.label,
      });
    } else {
      setTooltip(t => ({ ...t, visible: false }));
    }
  }, [data, avgData, height]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  return (
    <div ref={containerRef} className="chart-container" style={{ position: 'relative' }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip.visible && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 20,
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'var(--tx3)', fontSize: 10, fontWeight: 700 }}>{tooltip.label}</div>
          <div style={{ color: resolveColor(color), fontSize: 14, fontWeight: 700 }}>{tooltip.value}%</div>
          {showAvg && tooltip.avg !== undefined && (
            <div style={{ color: resolveColor(avgColor), fontSize: 11 }}>Class avg: {tooltip.avg}%</div>
          )}
        </div>
      )}
    </div>
  );
}
