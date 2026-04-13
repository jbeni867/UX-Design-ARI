import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

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
  const [autoStartBlocked, setAutoStartBlocked] = useState(false);
  const [synthType, setSynthType] = useState('FMSynth');
  const [activeNotes, setActiveNotes] = useState(new Set());

  const synthRef = useRef(null);
  const analyzerRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const pendingPointerNotesRef = useRef(new Map());
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

  useEffect(() => {
    let isMounted = true;

    const startAudioOnLoad = async () => {
      try {
        await Tone.start();
        if (!isMounted) return;
        setIsReady(true);
        setAutoStartBlocked(false);
      } catch {
        if (!isMounted) return;
        setAutoStartBlocked(true);
      }
    };

    const retryOnWindowLoad = () => {
      void startAudioOnLoad();
    };

    if (document.readyState === 'complete') {
      void startAudioOnLoad();
    } else {
      window.addEventListener('load', retryOnWindowLoad, { once: true });
    }

    if (!analyzerRef.current) {
      analyzerRef.current = new Tone.Analyser('waveform', 256);
    }
    setupSynth(synthType);

    return () => {
      isMounted = false;
      window.removeEventListener('load', retryOnWindowLoad);
      if (synthRef.current) {
        synthRef.current.releaseAll();
        synthRef.current.dispose();
      }
    };
  }, []);

  const ensureAudioReady = async () => {
    if (isReady) {
      return;
    }

    await Tone.start();
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
    setupSynth(newType);
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
    pendingPointerNotesRef.current.delete(pointerId);

    if (isReady && synthRef.current) {
      const noteId = activePointersRef.current.get(pointerId);
      if (!noteId) return;
      synthRef.current.triggerRelease(noteId);
      activePointersRef.current.delete(pointerId);
      decrementActiveNote(noteId);
    }
  };

  const attackNoteForPointer = async (pointerId, noteName, targetOctave) => {
    if (synthRef.current) {
      const noteId = getNoteId(noteName, targetOctave);
      pendingPointerNotesRef.current.set(pointerId, noteId);

      await ensureAudioReady();

      if (pendingPointerNotesRef.current.get(pointerId) !== noteId) {
        return;
      }

      pendingPointerNotesRef.current.delete(pointerId);
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
        {/* Header Bar */}
        <header className="shrink-0 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-3 shadow-xl backdrop-blur-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px]">
              <h1 className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                Tone Grid Synth
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Interactive Music Grid • 7 Octaves • 12 Semitones
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full shadow-lg ${isReady ? 'animate-pulse bg-emerald-400 shadow-emerald-400/50' : 'bg-amber-400 shadow-amber-400/50'}`} />
                <p className="text-xs font-semibold text-emerald-400 sm:text-sm">{isReady ? 'Audio Engine Active' : autoStartBlocked ? 'Auto-start blocked by browser, starting on first interaction' : 'Starting audio engine...'}</p>
              </div>

              <div className="flex items-center gap-3">
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
        </header>

            {/* Note Grid */}
            <div className="flex min-h-0 flex-1 flex-col gap-1.5" role="grid" aria-label="Octave note grid">
              <div className="grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateRows: octaveGridTemplateRows }}>
                {octaves.map((rowOctave) => (
                  <div
                    className="grid h-full grid-cols-[clamp(52px,7vw,80px)_1fr] items-stretch gap-2"
                    role="row"
                    key={rowOctave}
                  >
                    {/* Octave Label */}
                    <div className="flex h-full items-center justify-center rounded-none border-2 border-slate-600/60 bg-slate-800/80 px-1 text-center text-[clamp(15px,1.7vw,18px)] font-black tracking-wide text-slate-100 shadow-lg backdrop-blur">
                      OCT {rowOctave}
                    </div>

                    {/* Note Buttons */}
                    <div
                      className="grid h-full gap-1 sm:gap-1.5"
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
                              'group relative h-full w-full touch-none overflow-hidden rounded-none border-2 text-[clamp(13px,1.4vw,18px)] font-extrabold leading-none shadow-lg backdrop-blur transition-colors duration-150',
                              colors.bg,
                              colors.text,
                              isPressed
                                ? `border-white/50 ${colors.glow} brightness-125 saturate-150`
                                : 'border-white/20 shadow-black/40',
                            ].join(' ')}
                            onPointerDown={async (event) => {
                              event.currentTarget.setPointerCapture(event.pointerId);
                              await attackNoteForPointer(event.pointerId, note, noteOctave);
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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note Axis Labels */}
              <div className="grid shrink-0 grid-cols-[clamp(52px,7vw,80px)_1fr] gap-2" aria-label="Note axis">
                <div aria-hidden="true" />
                <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: noteGridTemplateColumns }}>
                  {rowNotes.map(({ note }) => {
                    const colors = NOTE_COLORS[note];
                    return (
                      <div
                        key={`axis-${note}`}
                        className={`flex items-center justify-center rounded-none border border-white/10 ${colors.bg} ${colors.text} py-1 text-[clamp(13px,1.4vw,17px)] font-medium tracking-wider`}
                        aria-label={`Note ${note}`}
                      >
                        {note}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
      </div>
    </main>
  );
}

export default App;
