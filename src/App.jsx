import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';


const NOTE_ORDER = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

const SCALES = {
  chromatic: {
    label: 'Chromatic (All Notes)',
    intervals: [0,1,2,3,4,5,6,7,8,9,10,11],
  },
  major: {
    label: 'Major',
    intervals: [0,2,4,5,7,9,11],
  },
  minor: {
    label: 'Minor',
    intervals: [0,2,3,5,7,8,10],
  },
  pentatonicMajor: {
    label: 'Pentatonic Major',
    intervals: [0,2,4,7,9],
  },
  pentatonicMinor: {
    label: 'Pentatonic Minor',
    intervals: [0,3,5,7,10],
  },
};


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

// Sampler note maps — only the notes that have actual sample files.
// Tone.Sampler pitch-shifts any note not in the map from the nearest available sample.
// The repo uses "s" suffix for sharps (e.g. "As4" = A#4).
// Convert a filename stem like "As4" or "Cs3" to a Tone.js note name like "A#4" / "C#3".
// Natural notes (no "s") are returned unchanged.
const fileToNote = (stem) => stem.replace(/^([A-G])s(\d)$/, '$1#$2');

const makeSamplerUrls = (stems) =>
  Object.fromEntries(stems.map((stem) => [fileToNote(stem), `${stem}.mp3`]));

const SAMPLER_CONFIGS = {
  piano: {
    urls: makeSamplerUrls([
      'A1','A2','A3','A4','A5','A6','A7',
      'As1','As2','As3','As4','As5','As6','As7',
      'B1','B2','B3','B4','B5','B6','B7',
      'C1','C2','C3','C4','C5','C6','C7','C8',
      'Cs1','Cs2','Cs3','Cs4','Cs5','Cs6','Cs7',
      'D1','D2','D3','D4','D5','D6','D7',
      'Ds1','Ds2','Ds3','Ds4','Ds5','Ds6','Ds7',
      'E1','E2','E3','E4','E5','E6','E7',
      'F1','F2','F3','F4','F5','F6','F7',
      'Fs1','Fs2','Fs3','Fs4','Fs5','Fs6','Fs7',
      'G1','G2','G3','G4','G5','G6','G7',
      'Gs1','Gs2','Gs3','Gs4','Gs5','Gs6','Gs7',
    ]),
    baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
  },
  'guitar-acoustic': {
    urls: makeSamplerUrls([
      'A2','A3','A4',
      'As2','As3','As4',
      'B2','B3','B4',
      'C3','C4','C5',
      'Cs3','Cs4','Cs5',
      'D2','D3','D4','D5',
      'Ds2','Ds3','Ds4',
      'E2','E3','E4',
      'F2','F3','F4',
      'Fs2','Fs3','Fs4',
      'G2','G3','G4',
      'Gs2','Gs3','Gs4',
    ]),
    baseUrl: `${import.meta.env.BASE_URL}samples/guitar-acoustic/`,
  },
  flute: {
    urls: makeSamplerUrls(['A4','A5','A6','C4','C5','C6','C7','E4','E5','E6']),
    baseUrl: `${import.meta.env.BASE_URL}samples/flute/`,
  },
  violin: {
    urls: makeSamplerUrls(['A3','A4','A5','A6','C4','C5','C6','C7','E4','E5','E6','G3','G4','G5','G6']),
    baseUrl: `${import.meta.env.BASE_URL}samples/violin/`,
  },
  xylophone: {
    urls: makeSamplerUrls(['C5','C6','C7','C8','G4','G5','G6','G7']),
    baseUrl: `${import.meta.env.BASE_URL}samples/xylophone/`,
  },
};

// All available instrument options
const INSTRUMENT_OPTIONS = [
  { value: 'Synth',            label: 'Basic Synth',      isSampler: false },
  { value: 'FMSynth',         label: 'FM Synth',          isSampler: false },
  { value: 'AMSynth',         label: 'AM Synth',          isSampler: false },
  { value: 'piano',           label: 'Piano',             isSampler: true  },
  { value: 'guitar-acoustic', label: 'Acoustic Guitar',   isSampler: true  },
  { value: 'flute',           label: 'Flute',             isSampler: true  },
  { value: 'violin',          label: 'Violin',            isSampler: true  },
  { value: 'xylophone',       label: 'Xylophone',         isSampler: true  },
];

function InstrumentPickerModal({ current, onSelect, onClose }) {
  const synths = INSTRUMENT_OPTIONS.filter((o) => !o.isSampler);
  const samplers = INSTRUMENT_OPTIONS.filter((o) => o.isSampler);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-cyan-300">Select Instrument</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Synthesizers */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Synthesizers</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {synths.map((o) => (
            <button
              key={o.value}
              onClick={() => { onSelect(o.value); onClose(); }}
              className={[
                'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                current === o.value
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20'
                  : 'border-slate-600/50 bg-slate-800/60 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-700/60 hover:text-cyan-200',
              ].join(' ')}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Sampled Instruments */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Sampled Instruments</p>
        <div className="grid grid-cols-2 gap-2">
          {samplers.map((o) => (
            <button
              key={o.value}
              onClick={() => { onSelect(o.value); onClose(); }}
              className={[
                'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                current === o.value
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20'
                  : 'border-slate-600/50 bg-slate-800/60 text-slate-300 hover:border-purple-500/50 hover:bg-slate-700/60 hover:text-purple-200',
              ].join(' ')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [instrumentType, setInstrumentType] = useState('FMSynth');
  const [samplerLoading, setSamplerLoading] = useState(false);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedScale, setSelectedScale] = useState('major'); //For selecting key
  const [selectedKey, setSelectedKey] = useState('C');


  const instrumentRef = useRef(null);
  const samplerReadyRef = useRef(Promise.resolve());
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
    if (!analyzerRef.current) {
      analyzerRef.current = new Tone.Analyser('waveform', 256);
    }
    setupInstrument(instrumentType);

    return () => {
      disposeInstrument();
    };
  }, []);


  const allowedNotes = (() => {
    if (selectedScale === 'chromatic') {
      return new Set(NOTE_ORDER);
    }

    const scale = SCALES[selectedScale];
    const rootIndex = NOTE_ORDER.indexOf(selectedKey);

    return new Set(
      scale.intervals.map(
        (i) => NOTE_ORDER[(rootIndex + i) % 12]
      )
    );
  })();


  const disposeInstrument = () => {
    if (instrumentRef.current) {
      try {
        if (typeof instrumentRef.current.releaseAll === 'function') {
          instrumentRef.current.releaseAll();
        }
        instrumentRef.current.dispose();
      } catch {
        // ignore disposal errors
      }
      instrumentRef.current = null;
    }
  };

  const ensureAudioReady = async () => {
    if (isReady) return;
    // Must be called directly from a user gesture — Firefox enforces this strictly.
    await Tone.start();
    setIsReady(true);
  };

  const connectInstrument = (inst) => {
    if (analyzerRef.current) {
      inst.connect(analyzerRef.current);
      analyzerRef.current.toDestination();
    } else {
      inst.toDestination();
    }
  };

  const setupInstrument = (type) => {
    disposeInstrument();

    activePointersRef.current.clear();
    activeNoteCountsRef.current.clear();
    setActiveNotes(new Set());

    const option = INSTRUMENT_OPTIONS.find((o) => o.value === type);

    if (option?.isSampler) {
      const config = SAMPLER_CONFIGS[type];
      setSamplerLoading(true);
      let resolveReady;
      samplerReadyRef.current = new Promise((resolve) => { resolveReady = resolve; });
      const sampler = new Tone.Sampler({
        urls: config.urls,
        baseUrl: config.baseUrl,
        onload: () => { setSamplerLoading(false); resolveReady(); },
        onerror: (err) => { console.warn('Sampler file error:', err); resolveReady(); },
      });
      connectInstrument(sampler);
      instrumentRef.current = sampler;
    } else {
      samplerReadyRef.current = Promise.resolve();
      setSamplerLoading(false);
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
      connectInstrument(newSynth);
      instrumentRef.current = newSynth;
    }
  };

  const handleInstrumentChange = (newType) => {
    setInstrumentType(newType);
    setupInstrument(newType);
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

  const doRelease = (noteId) => {
    if (!instrumentRef.current) return;
    try {
      instrumentRef.current.triggerRelease(noteId);
    } catch {
      // ignore
    }
  };

  const releaseNoteForPointer = (pointerId) => {
    // Cancel any pending attack for this pointer so it never fires.
    pendingPointerNotesRef.current.delete(pointerId);

    const noteId = activePointersRef.current.get(pointerId);
    if (!noteId) return;

    doRelease(noteId);
    activePointersRef.current.delete(pointerId);
    decrementActiveNote(noteId);
  };

  const attackNoteForPointer = async (pointerId, noteName, targetOctave) => {
    if (!instrumentRef.current) return;

    const noteId = getNoteId(noteName, targetOctave);
    pendingPointerNotesRef.current.set(pointerId, noteId);

    await ensureAudioReady();
    await samplerReadyRef.current;

    // If the pointer was released before we finished loading, pendingPointerNotes
    // will have been deleted by releaseNoteForPointer — don't attack at all.
    if (pendingPointerNotesRef.current.get(pointerId) !== noteId) return;

    pendingPointerNotesRef.current.delete(pointerId);

    // Release any previous note on this pointer before attacking the new one.
    const previousNoteId = activePointersRef.current.get(pointerId);
    if (previousNoteId) doRelease(previousNoteId);

    try {
      instrumentRef.current.triggerAttack(noteId);
    } catch (err) {
      console.warn('triggerAttack error:', err);
      return;
    }
    activePointersRef.current.set(pointerId, noteId);
    incrementActiveNote(noteId);
  };

  return (
    <>
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
                {samplerLoading ? (
                  <>
                    <div className="h-2 w-2 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    <p className="text-xs font-semibold text-cyan-300 sm:text-sm">Loading samples…</p>
                  </>
                ) : (
                  <>
                    <div className={`h-2 w-2 rounded-full shadow-lg ${isReady ? 'animate-pulse bg-emerald-400 shadow-emerald-400/50' : 'animate-pulse bg-amber-400 shadow-amber-400/50'}`} />
                    <p className="text-xs font-semibold text-emerald-400 sm:text-sm">
                      {isReady ? 'Audio Engine Active' : 'Tap any note to start'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-cyan-300 sm:text-sm">Instrument</span>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="cursor-pointer rounded-xl border border-cyan-500/30 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-cyan-50 shadow-lg backdrop-blur transition-all duration-200 hover:border-cyan-400/50 hover:bg-slate-700/80"
                >
                  {INSTRUMENT_OPTIONS.find((o) => o.value === instrumentType)?.label ?? instrumentType}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cyan-300 sm:text-sm">
                  Scale
                </span>

                <select
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                  className="rounded-xl border border-cyan-500/30 bg-slate-800/80 px-3 py-2 text-sm text-slate-100"
                >
                  {Object.entries(SCALES).map(([key, scale]) => (
                    <option key={key} value={key}>
                      {scale.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  disabled={selectedScale === 'chromatic'}
                  className="rounded-xl border border-cyan-500/30 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
                >
                  {NOTE_ORDER.map((note) => (
                    <option key={note} value={note}>
                      {note}
                    </option>
                  ))}
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
                        const inScale = allowedNotes.has(note);
                        const disabled = samplerLoading || !inScale;


                        return (
                          <button
                            key={`note-${note}-${rowOctave}-${offset}`}
                            disabled={disabled}
                            className={[
                              'group relative h-full w-full touch-none overflow-hidden rounded-none border-2 text-[clamp(13px,1.4vw,18px)] font-extrabold leading-none shadow-lg backdrop-blur transition-colors duration-150',
                              colors.bg,
                              colors.text,
                              disabled
                                ? 'cursor-not-allowed opacity-40'
                                : isPressed
                                ? `border-white/50 ${colors.glow} brightness-125 saturate-150`
                                : 'border-white/20 shadow-black/40',
                            ].join(' ')}
                            onPointerDown={async (event) => {
                              if (disabled) return;
                              event.currentTarget.setPointerCapture(event.pointerId);
                              await attackNoteForPointer(event.pointerId, note, noteOctave);
                            }}
                            onPointerUp={(event) => {
                              if (disabled) return;
                              releaseNoteForPointer(event.pointerId);
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                            onPointerCancel={(event) => {
                              if (disabled) return;
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

    {pickerOpen && (
      <InstrumentPickerModal
        current={instrumentType}
        onSelect={handleInstrumentChange}
        onClose={() => setPickerOpen(false)}
      />
    )}
    </>
  );
}

export default App;
