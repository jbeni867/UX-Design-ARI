import { useEffect, useRef } from 'react';

const barColors = [
  '#ef4444', // red - C
  '#f97316', // orange - Db
  '#f59e0b', // amber - D
  '#eab308', // yellow - Eb
  '#84cc16', // lime - E
  '#22c55e', // green - F
  '#10b981', // emerald - Gb
  '#06b6d4', // cyan - G
  '#3b82f6', // blue - Ab
  '#6366f1', // indigo - A
  '#a855f7', // purple - Bb
  '#ec4899', // pink - B
];

export function AudioVisualizer({ analyzer }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const values = analyzer.getValue();
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);

      const barCount = 60;
      const barWidth = width / barCount;
      const step = Math.floor(values.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = values[i * step];
        const amplitude = Math.abs(value);
        const boostedAmplitude = Math.pow(amplitude * 3, 1.2);
        const barHeight = Math.min(boostedAmplitude, 1) * height * 0.9;

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        const colorIndex = i % barColors.length;
        gradient.addColorStop(0, barColors[colorIndex]);
        gradient.addColorStop(1, barColors[(colorIndex + 3) % barColors.length]);

        ctx.fillStyle = gradient;

        const x = i * barWidth + barWidth * 0.1;
        const y = height - barHeight;
        const w = barWidth * 0.8;
        const h = barHeight;

        ctx.fillRect(x, y, w, h);

        if (amplitude > 0.1) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = barColors[colorIndex];
          ctx.fillRect(x, y, w, h);
          ctx.shadowBlur = 0;
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyzer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="shrink-0 overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-1 shadow-xl backdrop-blur-sm">
      <div className="relative h-24 w-full overflow-hidden rounded-xl bg-black/40 sm:h-32">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </div>
  );
}
