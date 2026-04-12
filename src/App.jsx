import { useState, useRef } from 'react';
import * as Tone from 'tone';
import { AudioVisualizer } from './AudioVisualizer';

// Color mapping for each note
const NOTE_COLORS = {
  'C':  { bg: 'bg-red-500',     glow: 'shadow-red-500/50',     text: 'text-white' },
  'Db': { bg: 'bg-orange-500',  glow: 'shadow-orange-500/50',  text: 'text-white' },
  'D':  { bg: 'bg-amber-500',   glow: 'shadow-amber-500/50',   text: 'text-white' },
  'Eb': { bg: 'bg-yellow-500',  glow: 'shadow-yellow-500/50',  text: 'text-gray-900' },
  'E':  { bg: 'bg-lime-500',    glow: 'shadow-lime-500/50',    text: 'text-gray-900' },
  'F':  { bg: 'bg-green-500',   glow: 'shadow-green-500/50',   text: 'text-white' },
  'Gb': { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50', text: 'text-white' },
  'G':  { bg: 'bg-cyan-500',    glow: 'shadow-cyan-500/50',    text: 'text-gray-900' },
  'Ab': { bg: 'bg-blue-500',    glow: 'shadow-blue-500/50',    text: 'text-white' },
  'A':  { bg: 'bg-indigo-500',  glow: 'shadow-indigo-500/50',  text: 'text-white' },
  'Bb': { bg: 'bg-purple-500',  glow: 'shadow-purple-500/50',  text: 'text-white' },
  'B':  { bg: 'bg-pink-500',    glow: 'shadow-pink-500/50',    text: 'text-white' },
};

function App() {
  const [isReady, setIsReady] = useState(false);
  const [synthType, setSynthType] = useState('FMSynth');
  const [activeNotes, setActiveNotes] = useState(new Set());

  const synthRef = useRef(null);
  const analyzerRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const activeNoteCountsRef = useRef(new Map());

  const octaves = [7, 6, 5, 4, 3, 2, 1];
  const rowNotes = [
    { note: 'C',  offset: 0 },
    { note: 'Db', offset: 0 },
    { note: 'D',  offset: 0 },
    { note: 'Eb', offset: 0 },
    { note: 'E',  offset: 0 },
    { note: 'F',  offset: 0 },
    { note: 'Gb', offset: 0 },
    { note: 'G',  offset: 0 },
    { note: 'Ab', offset: 0 },
    { note: 'A',  offset: 0 },
    { note: 'Bb', offset: 0 },
    { note: 'B',  offset: 0 },
  ];

  const noteGridTemplateColumns = `repeat(${rowNotes.length}, minmax(0, 1fr))`;
  const octaveGridTemplateRows = `repeat(${octaves.length}, minmax(0, 1fr))`;

  const initializeAudio = async () => {
    await Tone.start();

    analyzerRef.current = new Tone.Analyser('waveform', 256);
    setupSynth(synthType);
    setIsReady(true);
  };

  const setupSynth = (type) => {
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
    }

    activePointersRef.current.clear();
    activeNoteCountsRef.current.clear();
    setActiveNotes(new Set());

    let newSynth;
    switch (type) {
      case 'FMSynth':
        newSynth = new Tone.PolySynth(Tone.FMSynth);
        break;
      case 'AMSynth':
        newSynth = new Tone.PolySynth(Tone.AMSynth);
        break;
      case 'Synth':
      default:
        newSynth = new Tone.PolySynth(Tone.Synth);
        break;
    }

    if (analyzerRef.current) {
      newSynth.connect(analyzerRef.current);
      analyzerRef.current.toDestination();
    } else {
      newSynth.toDestination();
    }

    synthRef.current = newSynth;
  };

  const handleSynthChange = (e) => {
    const newType = e.target.value;
    setSynthType(newType);
    if (isReady) setupSynth(newType);
  };

  const getNoteId = (noteName, targetOctave) => `${noteName}${targetOctave}`;

  const incrementActiveNote = (noteId) => {
    const nextCount = (activeNoteCountsRef.current.get(noteId) || 0) + 1;
    activeNoteCountsRef.current.set(noteId, nextCount);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });
  };

  const decrementActiveNote = (noteId) => {
    const currentCount = activeNoteCountsRef.current.get(noteId) || 0;
    if (currentCount <= 1) {
      activeNoteCountsRef.current.delete(noteId);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
      return;
    }
    activeNoteCountsRef.current.set(noteId, currentCount - 1);
  };

  const releaseNoteForPointer = (pointerId) => {
    if (isReady && synthRef.current) {
      const noteId = activePointersRef.current.get(pointerId);
      if (!noteId) return;
      synthRef.current.triggerRelease(noteId);
      activePointersRef.current.delete(pointerId);
      decrementActiveNote(noteId);
    }
  };

  const attackNoteForPointer = (pointerId, noteName, targetOctave) => {
    if (isReady && synthRef.current) {
      const noteId = getNoteId(noteName, targetOctave);
      const previousNoteId = activePointersRef.current.get(pointerId);
      if (previousNoteId) releaseNoteForPointer(pointerId);
      synthRef.current.triggerAttack(noteId);
      activePointersRef.current.set(pointerId, noteId);
      incrementActiveNote(noteId);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 px-2 py-2 text-slate-100 sm:px-4 sm:py-4">
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col gap-3">

        {/* Header */}
        <header className="shrink-0 text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
            Tone Grid Synth
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Interactive Music Grid • 7 Octaves • 12 Semitones
          </p>
        </header>

        {!isReady ? (
          /* Start Screen */
          <section className="mx-auto my-auto w-full max-w-xl">
            <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-10 text-center shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 shadow-lg shadow-purple-500/50">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="mb-3 text-lg text-slate-200">Ready to make some music?</p>
              <p className="mb-6 text-sm text-slate-400">Browsers require user interaction before playing audio.</p>
              <button
                onClick={initializeAudio}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/60 active:scale-95"
              >
                <span className="relative z-10">Start Audio Engine</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Controls Bar */}
            <div className="shrink-0 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-3 shadow-xl backdrop-blur-sm sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                  <p className="text-xs font-semibold text-emerald-400 sm:text-sm">Audio Engine Active</p>
                </div>
                <div className="flex items-center gap-4">
                  <label htmlFor="synth-select" className="text-xs font-semibold text-cyan-300 sm:text-sm">
                    Instrument
                  </label>
                  <select
                    id="synth-select"
                    value={synthType}
                    onChange={handleSynthChange}
                    className="cursor-pointer rounded-xl border border-cyan-500/30 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-cyan-50 shadow-lg outline-none ring-cyan-400/50 backdrop-blur transition-all duration-200 hover:border-cyan-400/50 focus:ring-2"
                  >
                    <option value="Synth">Basic Synth</option>
                    <option value="FMSynth">FM Synth</option>
                    <option value="AMSynth">AM Synth</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Audio Visualizer */}
            {analyzerRef.current && (
              <AudioVisualizer analyzer={analyzerRef.current} />
            )}

            {/* Note Grid */}
            <div className="flex min-h-0 flex-1 flex-col gap-2" role="grid" aria-label="Octave note grid">
              <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateRows: octaveGridTemplateRows }}>
                {octaves.map((rowOctave) => (
                  <div
                    className="grid h-full grid-cols-[clamp(52px,7vw,80px)_1fr] items-stretch gap-2"
                    role="row"
                    key={rowOctave}
                  >
                    {/* Octave Label */}
                    <div className="flex h-full items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-purple-950/40 px-1 text-center text-[clamp(11px,1.2vw,13px)] font-black tracking-wide text-cyan-300 shadow-lg">
                      OCT {rowOctave}
                    </div>

                    {/* Note Buttons */}
                    <div
                      className="grid h-full gap-1.5 sm:gap-2"
                      style={{ gridTemplateColumns: noteGridTemplateColumns }}
                      role="group"
                      aria-label={`Octave ${rowOctave} notes`}
                    >
                      {rowNotes.map(({ note, offset }) => {
                        const noteOctave = rowOctave + offset;
                        const noteId = getNoteId(note, noteOctave);
                        const isPressed = activeNotes.has(noteId);
                        const colors = NOTE_COLORS[note];

                        return (
                          <button
                            key={`note-${note}-${rowOctave}-${offset}`}
                            className={[
                              'group relative h-full w-full touch-none overflow-hidden rounded-lg border-2 text-[clamp(9px,1vw,13px)] font-extrabold leading-none shadow-lg backdrop-blur transition-all duration-150',
                              colors.bg,
                              colors.text,
                              isPressed
                                ? `scale-90 ${colors.glow} shadow-2xl border-white/50 brightness-125`
                                : 'scale-100 border-white/20 shadow-black/40 hover:scale-105 hover:brightness-110 active:scale-90',
                            ].join(' ')}
                            onPointerDown={(event) => {
                              event.currentTarget.setPointerCapture(event.pointerId);
                              attackNoteForPointer(event.pointerId, note, noteOctave);
                            }}
                            onPointerUp={(event) => {
                              releaseNoteForPointer(event.pointerId);
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                            onPointerCancel={(event) => {
                              releaseNoteForPointer(event.pointerId);
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                          >
                            <span className="relative z-10 flex h-full items-center justify-center">
                              {note}
                              <span className="ml-0.5 text-[0.8em] opacity-80">{noteOctave}</span>
                            </span>

                            {/* Glow overlay when pressed */}
                            {isPressed && (
                              <div className="absolute inset-0 animate-pulse bg-white/20" />
                            )}

                            {/* Hover gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note Axis Labels */}
              <div className="grid shrink-0 grid-cols-[clamp(52px,7vw,80px)_1fr] gap-2" aria-label="Note axis">
                <div className="flex items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-purple-950/40 px-1 py-2 text-[clamp(10px,1vw,12px)] font-black tracking-wider text-cyan-300 shadow-lg">
                  NOTE
                </div>
                <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: noteGridTemplateColumns }}>
                  {rowNotes.map(({ note }) => {
                    const colors = NOTE_COLORS[note];
                    return (
                      <div
                        key={`axis-${note}`}
                        className={`flex items-center justify-center rounded-lg border-2 border-white/20 ${colors.bg} ${colors.text} py-2 text-[clamp(9px,1vw,12px)] font-black tracking-wider shadow-lg`}
                        aria-label={`Note ${note}`}
                      >
                        {note}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
