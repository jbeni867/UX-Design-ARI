import { useState, useRef } from 'react';
import * as Tone from 'tone';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [synthType, setSynthType] = useState('Synth');
  const [activeNotes, setActiveNotes] = useState(new Set());
  
  const synthRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const activeNoteCountsRef = useRef(new Map());

  const octaves = [7, 6, 5, 4, 3, 2, 1];
  const rowNotes = [
    { note: 'C', offset: 0 },
    { note: 'D', offset: 0 },
    { note: 'E', offset: 0 },
    { note: 'F', offset: 0 },
    { note: 'G', offset: 0 },
    { note: 'A', offset: 0 },
    { note: 'B', offset: 0 },
  ];

  const initializeAudio = async () => {
    await Tone.start();
    console.log('Audio context is ready');
    setupSynth(synthType);
    setIsReady(true);
  };

  // Function to create and route a new synthesizer
  const setupSynth = (type) => {
    // Clean up the old synth if it exists to prevent memory leaks
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
    }

    activePointersRef.current.clear();
    activeNoteCountsRef.current.clear();
    setActiveNotes(new Set());

    // Create the new synth based on the selected type
    switch (type) {
      case 'FMSynth':
        // FMSynth is great for brassy or bell-like sounds
        synthRef.current = new Tone.PolySynth(Tone.FMSynth).toDestination();
        break;
      case 'AMSynth':
        // AMSynth has a slightly more harmonic, classic sci-fi feel
        synthRef.current = new Tone.PolySynth(Tone.AMSynth).toDestination();
        break;
      case 'Synth':
      default:
        // The standard basic oscillator
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
        break;
    }
  };

  // Handle changing the instrument from the dropdown
  const handleSynthChange = (e) => {
    const newType = e.target.value;
    setSynthType(newType);
    // Only try to set up the synth if the user has already started the audio engine
    if (isReady) {
      setupSynth(newType);
    }
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

  const attackNoteForPointer = (pointerId, noteName, targetOctave) => {
    if (isReady && synthRef.current) {
      const noteId = getNoteId(noteName, targetOctave);
      const previousNoteId = activePointersRef.current.get(pointerId);
      if (previousNoteId) {
        releaseNoteForPointer(pointerId);
      }

      synthRef.current.triggerAttack(noteId);
      activePointersRef.current.set(pointerId, noteId);
      incrementActiveNote(noteId);
    }
  };

  const releaseNoteForPointer = (pointerId) => {
    if (isReady && synthRef.current) {
      const noteId = activePointersRef.current.get(pointerId);
      if (!noteId) {
        return;
      }

      synthRef.current.triggerRelease(noteId);
      activePointersRef.current.delete(pointerId);
      decrementActiveNote(noteId);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_50%,_#020617)] px-2 py-2 text-slate-100 sm:px-3 sm:py-3">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <header className="mb-2 shrink-0 text-center sm:mb-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tone Grid Synth</h1>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Octaves on the Y axis with one left-to-right note row per octave.
          </p>
        </header>

        {!isReady ? (
          <section className="mx-auto my-auto w-full max-w-xl rounded-2xl border border-cyan-300/30 bg-slate-900/60 p-8 text-center shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <p className="mb-4 text-slate-200">Browsers require user interaction before playing audio.</p>
            <button
              onClick={initializeAudio}
              className="rounded-xl bg-cyan-400 px-7 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-300 active:translate-y-px"
            >
              Start Audio Engine
            </button>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/10 bg-slate-900/60 p-2 shadow-2xl shadow-black/30 backdrop-blur sm:p-3">
            <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-200/20 bg-slate-950/70 p-2 sm:mb-3 sm:p-3">
              <p className="text-xs font-semibold text-emerald-300 sm:text-sm">Audio engine is running</p>
              <div className="flex items-center gap-3">
                <label htmlFor="synth-select" className="text-xs font-semibold text-cyan-100 sm:text-sm">
                  Instrument
                </label>
                <select
                  id="synth-select"
                  value={synthType}
                  onChange={handleSynthChange}
                  className="rounded-lg border border-cyan-200/20 bg-slate-800 px-2 py-1.5 text-xs font-semibold text-cyan-50 outline-none ring-cyan-300/40 transition focus:ring-2 sm:px-3 sm:py-2 sm:text-sm"
                >
                  <option value="Synth">Basic Synth</option>
                  <option value="FMSynth">FM Synth</option>
                  <option value="AMSynth">AM Synth</option>
                </select>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-rows-7 gap-1" role="grid" aria-label="Octave note grid">
              {octaves.map((rowOctave) => (
                <div
                  className="grid h-full grid-cols-[clamp(48px,7vw,72px)_1fr] items-stretch gap-1 rounded-xl bg-slate-950/40 p-1"
                  role="row"
                  key={rowOctave}
                >
                  <div
                    className="flex h-full items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-400/10 px-1 text-center text-[clamp(10px,1.1vw,12px)] font-black tracking-wide text-cyan-200"
                    aria-label={`Octave ${rowOctave}`}
                  >
                    OCT {rowOctave}
                  </div>

                  <div
                    className="grid h-full grid-cols-7 gap-1"
                    role="group"
                    aria-label={`Octave ${rowOctave} notes`}
                  >
                    {rowNotes.map(({ note, offset }) => {
                      const noteOctave = rowOctave + offset;
                      const noteId = getNoteId(note, noteOctave);
                      const isPressed = activeNotes.has(noteId);
                      return (
                        <button
                          key={`note-${note}-${rowOctave}-${offset}`}
                          className={`h-full w-full touch-none rounded-md border text-[clamp(10px,1.1vw,14px)] font-extrabold leading-none shadow-lg transition ${
                            isPressed
                              ? 'border-cyan-300/70 bg-cyan-200 text-slate-950 shadow-cyan-900/40 translate-y-px'
                              : 'border-slate-200/20 bg-slate-100 text-slate-900 shadow-slate-950/20 hover:-translate-y-0.5 hover:bg-cyan-100'
                          }`}
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
                          {note}
                          {noteOctave}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;