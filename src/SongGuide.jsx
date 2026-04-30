import { useEffect, useRef } from 'react';

export const TWINKLE_SEQUENCE = [
  // Twinkle twinkle little star
  { note: 'C4', label: 'C', oct: 4 },
  { note: 'C4', label: 'C', oct: 4 },
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'A4', label: 'A', oct: 4 },
  { note: 'A4', label: 'A', oct: 4 },
  { note: 'G4', label: 'G', oct: 4 },
  // How I wonder what you are
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'D4', label: 'D', oct: 4 },
  { note: 'D4', label: 'D', oct: 4 },
  { note: 'C4', label: 'C', oct: 4 },
  // Up above the world so high
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'D4', label: 'D', oct: 4 },
  // Like a diamond in the sky
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'G4', label: 'G', oct: 4 },
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'F4', label: 'F', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'E4', label: 'E', oct: 4 },
  { note: 'D4', label: 'D', oct: 4 },
];

const NOTE_COLORS = {
  'C':  { bg: '#ef4444', text: '#fff' },
  'Db': { bg: '#f97316', text: '#fff' },
  'D':  { bg: '#f59e0b', text: '#fff' },
  'Eb': { bg: '#eab308', text: '#111' },
  'E':  { bg: '#84cc16', text: '#111' },
  'F':  { bg: '#22c55e', text: '#fff' },
  'Gb': { bg: '#10b981', text: '#fff' },
  'G':  { bg: '#06b6d4', text: '#111' },
  'Ab': { bg: '#3b82f6', text: '#fff' },
  'A':  { bg: '#6366f1', text: '#fff' },
  'Bb': { bg: '#a855f7', text: '#fff' },
  'B':  { bg: '#ec4899', text: '#fff' },
};

const LOOKAHEAD = 8;

export default function SongGuide({ activeNotes, step, setStep, onDismiss }) {
  const prevActiveRef = useRef(new Set());

  // Auto-advance only on a fresh press (note wasn't held last render)
  useEffect(() => {
    if (step >= TWINKLE_SEQUENCE.length) return;
    const expected = TWINKLE_SEQUENCE[step].note;
    const freshPress = activeNotes.has(expected) && !prevActiveRef.current.has(expected);
    if (freshPress) {
      setStep((s) => s + 1);
    }
    prevActiveRef.current = activeNotes;
  }, [activeNotes, step, setStep]);

  const done = step >= TWINKLE_SEQUENCE.length;

  // Visible window: 1 behind + current + LOOKAHEAD ahead
  const windowStart = Math.max(0, step - 1);
  const windowEnd   = Math.min(TWINKLE_SEQUENCE.length, step + LOOKAHEAD + 1);
  const visible     = TWINKLE_SEQUENCE.slice(windowStart, windowEnd).map((s, i) => ({
    ...s,
    globalIdx: windowStart + i,
  }));

  return (
    <div
      data-tutorial="song-guide"
      className="shrink-0 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-sm shadow-lg shadow-cyan-500/10 px-3 py-2 flex items-center gap-3"
    >
      {/* Label */}
      <div className="flex flex-col shrink-0 min-w-[72px]">
        <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase leading-none">
          ★ Twinkle
        </span>
        <span className="text-[9px] text-slate-500 mt-0.5">
          {done ? 'Complete!' : `${step}/${TWINKLE_SEQUENCE.length}`}
        </span>
      </div>

      {/* Note strip */}
      <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
        {done ? (
          <span className="text-sm font-black text-cyan-300">
            Well done! You played Twinkle Twinkle!
          </span>
        ) : (
          visible.map((s) => {
            const isDone    = s.globalIdx < step;
            const isCurrent = s.globalIdx === step;
            const isPlaying = isCurrent && activeNotes.has(s.note) && !isDone;
            const color     = NOTE_COLORS[s.label] ?? { bg: '#64748b', text: '#fff' };

            return (
              <div
                key={s.globalIdx}
                className="shrink-0 flex flex-col items-center justify-center rounded-lg border-2 font-black transition-all duration-100"
                style={{
                  width: isCurrent ? 48 : 36,
                  height: isCurrent ? 52 : 40,
                  background: isDone
                    ? 'rgba(15,23,42,0.3)'
                    : isPlaying
                    ? color.bg
                    : isCurrent
                    ? `${color.bg}44`
                    : `${color.bg}18`,
                  borderColor: isDone
                    ? 'rgba(71,85,105,0.2)'
                    : isPlaying
                    ? '#fff'
                    : isCurrent
                    ? color.bg
                    : `${color.bg}55`,
                  opacity: isDone ? 0.3 : 1,
                  boxShadow: isPlaying
                    ? `0 0 12px ${color.bg}`
                    : isCurrent
                    ? `0 0 6px ${color.bg}66`
                    : 'none',
                  transform: `scale(${isPlaying ? 1.1 : 1})`,
                }}
              >
                <span style={{
                  fontSize: isCurrent ? 15 : 12,
                  lineHeight: 1,
                  color: isDone ? '#334155' : isPlaying ? color.text : isCurrent ? color.bg : `${color.bg}99`,
                }}>
                  {s.label}
                </span>
                <span style={{
                  fontSize: isCurrent ? 12 : 10,
                  lineHeight: 1,
                  marginTop: 2,
                  color: isDone ? '#1e293b' : isPlaying ? color.text : '#475569',
                }}>
                  oct{s.oct}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {!done && (
          <button
            onClick={() => setStep(0)}
            className="text-[10px] text-slate-600 hover:text-slate-300 transition"
          >
            Reset
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-white transition text-xs px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
