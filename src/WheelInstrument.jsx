import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const NOTE_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_COLORS = {
  'C':  { fill: '#ef4444', text: '#fff' },
  'Db': { fill: '#f97316', text: '#fff' },
  'D':  { fill: '#f59e0b', text: '#fff' },
  'Eb': { fill: '#eab308', text: '#111' },
  'E':  { fill: '#84cc16', text: '#111' },
  'F':  { fill: '#22c55e', text: '#fff' },
  'Gb': { fill: '#10b981', text: '#fff' },
  'G':  { fill: '#06b6d4', text: '#111' },
  'Ab': { fill: '#3b82f6', text: '#fff' },
  'A':  { fill: '#6366f1', text: '#fff' },
  'Bb': { fill: '#a855f7', text: '#fff' },
  'B':  { fill: '#ec4899', text: '#fff' },
};

const SCALES = {
  chromatic:       { label: 'Chromatic', intervals: [0,1,2,3,4,5,6,7,8,9,10,11] },
  major:           { label: 'Major',     intervals: [0,2,4,5,7,9,11] },
  minor:           { label: 'Minor',     intervals: [0,2,3,5,7,8,10] },
  pentatonicMajor: { label: 'Penta Maj', intervals: [0,2,4,7,9] },
  pentatonicMinor: { label: 'Penta Min', intervals: [0,3,5,7,10] },
};

// 7 natural note roots shown on chord wheel segments
const CHORD_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Chord types selectable via d-pad / strip below chord wheel
const CHORD_TYPES = [
  { label: 'Maj',  short: 'Maj',  intervals: [0, 4, 7] },
  { label: 'Min',  short: 'Min',  intervals: [0, 3, 7] },
  { label: 'Maj7', short: 'Maj7', intervals: [0, 4, 7, 11] },
  { label: 'Min7', short: 'Min7', intervals: [0, 3, 7, 10] },
  { label: 'Dom7', short: '7',    intervals: [0, 4, 7, 10] },
  { label: 'Sus2', short: 'Sus2', intervals: [0, 2, 7] },
  { label: 'Sus4', short: 'Sus4', intervals: [0, 5, 7] },
  { label: 'Dim',  short: 'Dim',  intervals: [0, 3, 6] },
];

// Shifts each natural note up one semitone (used by RB-hold semitone mode)
const SEMITONE_SHIFT = {
  'C': 'Db', 'D': 'Eb', 'E': 'F',
  'F': 'Gb', 'G': 'Ab', 'A': 'Bb', 'B': 'C',
};

const GAMEPAD_NOTE_ID    = -1;
const GAMEPAD_CHORD_BASE = -10; // virtual pointers -10..-13 for up to 4 chord notes
const STICK_DEAD_ZONE    = 0.25;
const TRIGGER_THRESHOLD  = 0.3;

function stickToSegment(x, y, segCount) {
  if (Math.hypot(x, y) < STICK_DEAD_ZONE) return null;
  const angle = Math.atan2(y, x);
  const halfSeg = 1 / segCount / 2;
  const normalised = ((angle + Math.PI / 2) / (2 * Math.PI) + 1 + halfSeg) % 1;
  return Math.floor(normalised * segCount) % segCount;
}

function buildChord(rootNote, chordIntervals, octave) {
  const rootIdx = NOTE_ORDER.indexOf(rootNote);
  return chordIntervals.map((interval) => {
    const noteIdx = (rootIdx + interval) % 12;
    const octaveOffset = Math.floor((rootIdx + interval) / 12);
    return `${NOTE_ORDER[noteIdx]}${octave + octaveOffset}`;
  });
}

function slicePath(cx, cy, r, startAngle, endAngle, innerR = 0) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  if (innerR <= 0) {
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
  const ix1 = cx + innerR * Math.cos(toRad(startAngle));
  const iy1 = cy + innerR * Math.sin(toRad(startAngle));
  const ix2 = cx + innerR * Math.cos(toRad(endAngle));
  const iy2 = cy + innerR * Math.sin(toRad(endAngle));
  return [`M ${ix1} ${iy1}`, `L ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${ix2} ${iy2}`, `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`, 'Z'].join(' ');
}

// ── Chord Wheel ──────────────────────────────────────────────────────────────
function ChordWheel({ cx, cy, radius, chordTypeIdx, activeChordIdx, gamepadHighlight, onChordDown, onChordUp, innerR = 28 }) {
  const segAngle = 360 / CHORD_ROOTS.length;
  const startOffset = -90 - segAngle / 2;

  return (
    <g>
      {CHORD_ROOTS.map((root, i) => {
        const startAngle = startOffset + i * segAngle;
        const endAngle = startAngle + segAngle;
        const midAngle = startAngle + segAngle / 2;
        const midRad = (midAngle * Math.PI) / 180;
        const labelR = (radius + innerR) / 2;
        const lx = cx + labelR * Math.cos(midRad);
        const ly = cy + labelR * Math.sin(midRad);
        const colors = NOTE_COLORS[root] || { fill: '#64748b', text: '#fff' };
        const isActive = activeChordIdx === i;
        const isHighlighted = gamepadHighlight === i;
        const fill = isActive ? colors.fill : isHighlighted ? colors.fill + 'aa' : '#cbd5e1';

        return (
          <g key={root}>
            <path
              d={slicePath(cx, cy, radius, startAngle, endAngle, innerR)}
              fill={fill}
              stroke={isActive || isHighlighted ? '#fff' : '#94a3b8'}
              strokeWidth={isActive ? 2.5 : isHighlighted ? 2 : 1}
              style={{
                cursor: 'pointer',
                filter: isActive
                  ? `drop-shadow(0 0 7px ${colors.fill})`
                  : isHighlighted ? `drop-shadow(0 0 4px ${colors.fill})` : 'none',
              }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onChordDown(i, e.pointerId); }}
              onPointerUp={(e) => { onChordUp(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
              onPointerCancel={(e) => { onChordUp(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
            />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={13} fontWeight="800"
              fill={isActive || isHighlighted ? colors.text : '#1e293b'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {root}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#d97706" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={innerR} fill="#1e293b" stroke="#d97706" strokeWidth={3} />
      <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="central"
        fontSize={7} fontWeight="700" fill="#94a3b8" style={{ pointerEvents: 'none', userSelect: 'none' }}>TYPE</text>
      <text x={cx} y={cy + 6} textAnchor="middle" dominantBaseline="central"
        fontSize={9} fontWeight="800" fill="#f1f5f9" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {CHORD_TYPES[chordTypeIdx].short}
      </text>
    </g>
  );
}

// ── Note Wheel ───────────────────────────────────────────────────────────────
function NoteWheel({ cx, cy, radius, notes, activeNoteSet, gamepadHighlight, onNoteDown, onNoteUp, innerR = 28 }) {
  const segAngle = 360 / notes.length;
  const startOffset = -90 - segAngle / 2;

  return (
    <g>
      {notes.map((note, i) => {
        const startAngle = startOffset + i * segAngle;
        const endAngle = startAngle + segAngle;
        const midAngle = startAngle + segAngle / 2;
        const midRad = (midAngle * Math.PI) / 180;
        const labelR = (radius + innerR) / 2;
        const lx = cx + labelR * Math.cos(midRad);
        const ly = cy + labelR * Math.sin(midRad);
        const colors = NOTE_COLORS[note] || { fill: '#64748b', text: '#fff' };
        const isActive = activeNoteSet.has(note);
        const isHighlighted = gamepadHighlight === i;
        const fill = isActive ? colors.fill : isHighlighted ? colors.fill + 'aa' : '#cbd5e1';

        return (
          <g key={note}>
            <path
              d={slicePath(cx, cy, radius, startAngle, endAngle, innerR)}
              fill={fill}
              stroke={isActive || isHighlighted ? '#fff' : '#94a3b8'}
              strokeWidth={isActive ? 2.5 : isHighlighted ? 2 : 1}
              style={{
                cursor: 'pointer',
                filter: isActive
                  ? `drop-shadow(0 0 6px ${colors.fill})`
                  : isHighlighted ? `drop-shadow(0 0 4px ${colors.fill})` : 'none',
              }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onNoteDown(note, e.pointerId); }}
              onPointerUp={(e) => { onNoteUp(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
              onPointerCancel={(e) => { onNoteUp(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
            />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={radius > 90 ? 13 : 11} fontWeight="700"
              fill={isActive || isHighlighted ? colors.text : '#1e293b'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {note}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#d97706" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={innerR} fill="#1e293b" stroke="#d97706" strokeWidth={3} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize={10} fontWeight="800" fill="#f1f5f9" style={{ pointerEvents: 'none', userSelect: 'none' }}>R</text>
    </g>
  );
}

function TriggerBar({ label, value, color }) {
  const pct = Math.max(0, (value + 1) / 2) * 100;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold text-slate-400">{label}</span>
      <div className="h-14 w-4 overflow-hidden rounded-full border border-slate-600 bg-slate-800">
        <div className="w-full rounded-full transition-all duration-75"
          style={{ height: `${pct}%`, background: color, marginTop: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

function GamepadBadge({ connected, id }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${connected ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' : 'border-slate-600/40 bg-slate-900/60 text-slate-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-slate-600'}`} />
      {connected ? (id ?? 'Gamepad connected') : 'No gamepad — connect a controller'}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WheelInstrument({
  attackNoteForPointer,
  releaseNoteForPointer,
  activeNotes,
  samplerLoading,
  selectedScale,
  selectedKey,
  isAudioReady,
  ensureAudioReady,
  isGamepadConnected,
}) {
  const [selectedOctave, setSelectedOctave]     = useState(4);
  const [selectedChordType, setSelectedChordType] = useState(0);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadId, setGamepadId]               = useState(null);
  const [activeChordIdx, setActiveChordIdx]     = useState(null);
  const [semitoneMode, setSemitoneMode]         = useState(false);
  const [gpChordIdx, setGpChordIdx]             = useState(null);
  const [gpNoteIdx, setGpNoteIdx]               = useState(null);
  const [ltValue, setLtValue]                   = useState(-1);
  const [rtValue, setRtValue]                   = useState(-1);

  const semitoneModeRef       = useRef(false);
  const selectedChordTypeRef  = useRef(0);
  const pointerChordRef       = useRef(new Map());
  const pointerNoteRef        = useRef(new Map());

  // Stable refs for rAF loop
  const samplerLoadingRef  = useRef(samplerLoading);
  const isAudioReadyRef    = useRef(isAudioReady);
  const selectedOctaveRef  = useRef(selectedOctave);
  const selectedKeyRef     = useRef(selectedKey);
  useEffect(() => { samplerLoadingRef.current  = samplerLoading; }, [samplerLoading]);
  useEffect(() => { isAudioReadyRef.current    = isAudioReady; }, [isAudioReady]);
  useEffect(() => { selectedOctaveRef.current  = selectedOctave; }, [selectedOctave]);
  useEffect(() => { selectedKeyRef.current     = selectedKey; }, [selectedKey]);
  useEffect(() => { selectedChordTypeRef.current = selectedChordType; }, [selectedChordType]);

  const allowedNotes = useMemo(() => {
    if (selectedScale === 'chromatic') return new Set(NOTE_ORDER);
    const scale = SCALES[selectedScale];
    if (!scale) return new Set(NOTE_ORDER);
    const rootIndex = NOTE_ORDER.indexOf(selectedKey);
    return new Set(scale.intervals.map((i) => NOTE_ORDER[(rootIndex + i) % 12]));
  }, [selectedScale, selectedKey]);

  const wheelNotes = useMemo(() => {
    const base = NOTE_ORDER.filter((n) => allowedNotes.has(n));
    if (!semitoneMode) return base;
    return base.map((n) => SEMITONE_SHIFT[n] ?? n);
  }, [allowedNotes, semitoneMode]);

  const wheelNotesRef = useRef(wheelNotes);
  useEffect(() => { wheelNotesRef.current = wheelNotes; }, [wheelNotes]);

  const octaves = [1, 2, 3, 4, 5, 6, 7];

  const activeNoteNames = useMemo(() => {
    const s = new Set();
    for (const id of activeNotes) s.add(id.replace(/\d+$/, ''));
    return s;
  }, [activeNotes]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const handleChordDown = useCallback(async (rootIdx, pointerId) => {
    if (samplerLoading) return;
    pointerChordRef.current.set(pointerId, rootIdx);
    setActiveChordIdx(rootIdx);
    const chordType = CHORD_TYPES[selectedChordTypeRef.current];
    const chord = buildChord(CHORD_ROOTS[rootIdx], chordType.intervals, selectedOctaveRef.current);
    for (let i = 0; i < chord.length; i++) {
      const note = chord[i].replace(/\d+$/, '');
      const oct  = parseInt(chord[i].match(/\d+$/)[0], 10);
      await attackNoteForPointer(pointerId * 100 + i, note, oct);
    }
  }, [samplerLoading, attackNoteForPointer]);

  const handleChordUp = useCallback((pointerId) => {
    const rootIdx = pointerChordRef.current.get(pointerId);
    if (rootIdx === undefined) return;
    pointerChordRef.current.delete(pointerId);
    const chordType = CHORD_TYPES[selectedChordTypeRef.current];
    for (let i = 0; i < chordType.intervals.length; i++) {
      releaseNoteForPointer(pointerId * 100 + i);
    }
    if (pointerChordRef.current.size === 0) setActiveChordIdx(null);
  }, [releaseNoteForPointer]);

  const handleNoteDown = useCallback(async (note, pointerId) => {
    if (samplerLoading) return;
    pointerNoteRef.current.set(pointerId, note);
    await attackNoteForPointer(pointerId, note, selectedOctaveRef.current);
  }, [samplerLoading, attackNoteForPointer]);

  const handleNoteUp = useCallback((pointerId) => {
    pointerNoteRef.current.delete(pointerId);
    releaseNoteForPointer(pointerId);
  }, [releaseNoteForPointer]);

  // ── Gamepad rAF loop ──────────────────────────────────────────────────────
  const rafRef           = useRef(null);
  const prevRef          = useRef({});
  const gpChordHoldingRef = useRef(false);
  const gpNoteHoldingRef  = useRef(false);

  // Stable setter refs
  const setGpChordIdxRef       = useRef(setGpChordIdx);
  const setGpNoteIdxRef        = useRef(setGpNoteIdx);
  const setLtValueRef          = useRef(setLtValue);
  const setRtValueRef          = useRef(setRtValue);
  const setSelectedOctaveRef2  = useRef(setSelectedOctave);
  const setSelectedChordTypeRef2 = useRef(setSelectedChordType);
  const setActiveChordIdxRef   = useRef(setActiveChordIdx);
  const setSemitoneModeRef     = useRef(setSemitoneMode);
  const attackRef         = useRef(attackNoteForPointer);
  const releaseRef        = useRef(releaseNoteForPointer);
  const ensureAudioRef    = useRef(ensureAudioReady);
  useEffect(() => { attackRef.current      = attackNoteForPointer; }, [attackNoteForPointer]);
  useEffect(() => { releaseRef.current     = releaseNoteForPointer; }, [releaseNoteForPointer]);
  useEffect(() => { ensureAudioRef.current = ensureAudioReady; }, [ensureAudioReady]);

  useEffect(() => {
    const poll = () => {
      const gp = Array.from(navigator.getGamepads?.() ?? []).find((g) => g?.connected);
      if (!gp) { rafRef.current = requestAnimationFrame(poll); return; }

      const notes    = wheelNotesRef.current;
      const octave   = selectedOctaveRef.current;
      const attack   = attackRef.current;
      const release  = releaseRef.current;
      const chordType = CHORD_TYPES[selectedChordTypeRef.current];

      // Unlock audio engine on any gamepad input (sticks outside dead zone or any button pressed)
      if (!isAudioReadyRef.current) {
        const anyStick = Math.hypot(gp.axes[0] ?? 0, gp.axes[1] ?? 0) > STICK_DEAD_ZONE
          || Math.hypot(gp.axes[2] ?? 0, gp.axes[3] ?? 0) > STICK_DEAD_ZONE;
        const anyButton = gp.buttons.some((b) => b?.pressed);
        if (anyStick || anyButton) {
          ensureAudioRef.current?.();
        }
      }

      const canPlay  = isAudioReadyRef.current && !samplerLoadingRef.current;

      // ── Left stick → chord wheel ────────────────────────────────────
      const chordSeg    = stickToSegment(gp.axes[0] ?? 0, gp.axes[1] ?? 0, CHORD_ROOTS.length);
      const prevChordSeg = prevRef.current.chordSeg ?? null;

      if (chordSeg !== prevChordSeg) {
        // Always release all chord pointers to cancel any in-flight async attacks
        for (let i = 0; i < chordType.intervals.length; i++)
          release(GAMEPAD_CHORD_BASE - i);
        gpChordHoldingRef.current = false;
        setActiveChordIdxRef.current(null);

        if (chordSeg !== null && canPlay) {
          const chord = buildChord(CHORD_ROOTS[chordSeg], chordType.intervals, octave);
          for (let i = 0; i < chord.length; i++) {
            const note = chord[i].replace(/\d+$/, '');
            const oct  = parseInt(chord[i].match(/\d+$/)[0], 10);
            attack(GAMEPAD_CHORD_BASE - i, note, oct);
          }
          gpChordHoldingRef.current = true;
          setActiveChordIdxRef.current(chordSeg);
        }
        setGpChordIdxRef.current(chordSeg);
      }

      // ── Right stick → note wheel ────────────────────────────────────
      const noteSeg   = stickToSegment(gp.axes[2] ?? 0, gp.axes[3] ?? 0, notes.length);
      const prevNoteSeg = prevRef.current.noteSeg ?? null;
      const targetNote  = noteSeg !== null ? notes[noteSeg] : null;

      if (noteSeg !== prevNoteSeg) {
        // Always release to cancel any in-flight async attack
        release(GAMEPAD_NOTE_ID);
        gpNoteHoldingRef.current = false;
        if (targetNote && canPlay) {
          attack(GAMEPAD_NOTE_ID, targetNote, octave);
          gpNoteHoldingRef.current = true;
        }
        setGpNoteIdxRef.current(noteSeg);
      }

      // ── Trigger visual bars ─────────────────────────────────────────
      const lt = Math.max(gp.buttons[6]?.value ?? 0, ((gp.axes[4] ?? -1) + 1) / 2);
      const rt = Math.max(gp.buttons[7]?.value ?? 0, ((gp.axes[5] ?? -1) + 1) / 2);
      if (Math.abs(lt - (prevRef.current.ltRaw ?? 0)) > 0.01) setLtValueRef.current(lt * 2 - 1);
      if (Math.abs(rt - (prevRef.current.rtRaw ?? 0)) > 0.01) setRtValueRef.current(rt * 2 - 1);

      // ── A (0) = oct−, B (1) = oct+ ─────────────────────────────────
      const aBtn = gp.buttons[0]?.pressed ?? false;
      const bBtn = gp.buttons[1]?.pressed ?? false;
      if (aBtn && !(prevRef.current.aBtn ?? false)) setSelectedOctaveRef2.current((o) => Math.max(1, o - 1));
      if (bBtn && !(prevRef.current.bBtn ?? false)) setSelectedOctaveRef2.current((o) => Math.min(7, o + 1));

      // ── D-pad left (14) / right (15) = cycle chord type ────────────
      const dLeft  = gp.buttons[14]?.pressed ?? false;
      const dRight = gp.buttons[15]?.pressed ?? false;
      if (dLeft  && !(prevRef.current.dLeft  ?? false)) setSelectedChordTypeRef2.current((t) => (t - 1 + CHORD_TYPES.length) % CHORD_TYPES.length);
      if (dRight && !(prevRef.current.dRight ?? false)) setSelectedChordTypeRef2.current((t) => (t + 1) % CHORD_TYPES.length);

      // ── RB (button 5) = hold for semitone mode ──────────────────────
      const rbBtn = gp.buttons[5]?.pressed ?? false;
      const prevRb = prevRef.current.rbBtn ?? false;
      if (rbBtn !== prevRb) {
        semitoneModeRef.current = rbBtn;
        setSemitoneModeRef.current(rbBtn);
        // Seamlessly re-attack the held note in the new semitone context
        if (gpNoteHoldingRef.current && noteSeg !== null && canPlay) {
          const currentNote = wheelNotesRef.current[noteSeg];
          const nextNote = rbBtn
            ? (SEMITONE_SHIFT[currentNote] ?? currentNote)
            : (Object.keys(SEMITONE_SHIFT).find((k) => SEMITONE_SHIFT[k] === currentNote) ?? currentNote);
          release(GAMEPAD_NOTE_ID);
          attack(GAMEPAD_NOTE_ID, nextNote, octave);
        }
      }

      prevRef.current = { chordSeg, noteSeg, ltRaw: lt, rtRaw: rt, aBtn, bBtn, dLeft, dRight, rbBtn };
      rafRef.current = requestAnimationFrame(poll);
    };

    const onConnect = (e) => {
      setGamepadConnected(true);
      setGamepadId(e.gamepad.id.split('(')[0].trim().slice(0, 40));
      if (!rafRef.current) rafRef.current = requestAnimationFrame(poll);
    };
    const onDisconnect = () => {
      setGamepadConnected(false);
      setGamepadId(null);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const chordType = CHORD_TYPES[selectedChordTypeRef.current];
      if (gpChordHoldingRef.current) {
        for (let i = 0; i < chordType.intervals.length; i++)
          releaseRef.current(GAMEPAD_CHORD_BASE - i);
        gpChordHoldingRef.current = false;
      }
      if (gpNoteHoldingRef.current) { releaseRef.current(GAMEPAD_NOTE_ID); gpNoteHoldingRef.current = false; }
    };

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);

    const already = Array.from(navigator.getGamepads?.() ?? []).find((g) => g?.connected);
    if (already) {
      setGamepadConnected(true);
      setGamepadId(already.id.split('(')[0].trim().slice(0, 40));
      rafRef.current = requestAnimationFrame(poll);
    }

    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const chordType = CHORD_TYPES[selectedChordTypeRef.current];
      if (gpChordHoldingRef.current)
        for (let i = 0; i < chordType.intervals.length; i++)
          releaseRef.current(GAMEPAD_CHORD_BASE - i);
      if (gpNoteHoldingRef.current) releaseRef.current(GAMEPAD_NOTE_ID);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — loop reads everything via refs

  // SVG layout
  const svgW  = 520;
  const svgH  = 372;
  const r     = 110;
  const innerR = 30;
  const lCx   = 130;
  const rCx   = 390;
  const cy    = 165;

  const activeChordLabel = activeChordIdx !== null
    ? `${CHORD_ROOTS[activeChordIdx]} ${CHORD_TYPES[selectedChordType].label}`
    : null;

  const activeNoteName = gpNoteIdx !== null && gpNoteHoldingRef.current
    ? `${wheelNotes[gpNoteIdx]}${selectedOctave}`
    : null;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 select-none">

      {/* Audio unlock overlay */}
      {!isAudioReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <button
              className="rounded-2xl border-2 border-cyan-400 bg-slate-900 px-8 py-4 text-base font-bold text-cyan-200 shadow-xl shadow-cyan-500/30 transition-all hover:bg-slate-800 active:scale-95"
              onClick={async () => { if (ensureAudioReady) await ensureAudioReady(); }}
            >
              Tap to enable audio
            </button>
            {isGamepadConnected && (
              <p className="text-xs font-semibold text-slate-400">
                or press any button / move a stick on your controller
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex w-full max-w-[600px] items-center justify-between gap-3 px-1">
        <GamepadBadge connected={gamepadConnected} id={gamepadId} />
        <div className="flex items-center gap-3">
          <TriggerBar label="LT oct−" value={ltValue} color="#818cf8" />
          <TriggerBar label="RT" value={rtValue} color="#a78bfa" />
        </div>
      </div>

      {/* Dual wheel SVG */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="h-full max-h-105 w-full max-w-150 overflow-visible"
          style={{ touchAction: 'none' }}
        >
          {/* Panel backgrounds */}
          <rect x={10}  y={20} width={230} height={300} rx={18} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />
          <rect x={280} y={20} width={230} height={300} rx={18} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />

          {/* Panel titles */}
          <text x={125} y={15} textAnchor="middle" fontSize={10} fontWeight="700" fill="#94a3b8">CHORD SELECT</text>
          <text x={395} y={15} textAnchor="middle" fontSize={10} fontWeight="700" fill="#94a3b8">NOTE SELECT</text>

          {/* Chord type strip — OUTSIDE left panel */}
          {(() => {
            const stripY = 335;
            const btnW   = 34;
            const gap    = 4;
            const totalW = CHORD_TYPES.length * btnW + (CHORD_TYPES.length - 1) * gap;
            const startX = lCx - totalW / 2;
            return (
              <g>
                {CHORD_TYPES.map((ct, i) => {
                  const bx = startX + i * (btnW + gap) + btnW / 2;
                  const isSelected = selectedChordType === i;
                  return (
                    <g key={ct.label} style={{ cursor: 'pointer' }} onClick={() => setSelectedChordType(i)}>
                      <rect x={bx - btnW / 2} y={stripY - 9} width={btnW} height={18} rx={5}
                        fill={isSelected ? '#d97706' : '#1e293b'}
                        stroke={isSelected ? '#fbbf24' : '#334155'}
                        strokeWidth={isSelected ? 2 : 1}
                        style={{ filter: isSelected ? 'drop-shadow(0 0 4px #d97706)' : 'none' }}
                      />
                      <text x={bx} y={stripY} textAnchor="middle" dominantBaseline="central"
                        fontSize={7.5} fontWeight="800"
                        fill={isSelected ? '#fff' : '#64748b'}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {ct.short}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Semitone badge — OUTSIDE right panel */}
          <g>
            <rect x={335} y={326} width={120} height={18} rx={9}
              fill={semitoneMode ? '#7c3aed' : '#0f172a'}
              stroke={semitoneMode ? '#a78bfa' : '#475569'}
              strokeWidth={1.5}
            />
            <text x={395} y={335} textAnchor="middle" dominantBaseline="central"
              fontSize={8.5} fontWeight="800"
              fill={semitoneMode ? '#e9d5ff' : '#64748b'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {semitoneMode ? '♯/♭ SEMITONES' : 'HOLD RB: ♯/♭'}
            </text>
          </g>

          {/* Octave strip — OUTSIDE right panel */}
          {(() => {
            const octY   = 358;
            const btnR   = 8;
            const startX = rCx - (octaves.length - 1) * 18 / 2;
            return (
              <g>
                {octaves.map((oct, i) => {
                  const ox = startX + i * 18;
                  const isSelected = selectedOctave === oct;
                  return (
                    <g key={oct} style={{ cursor: 'pointer' }} onClick={() => setSelectedOctave(oct)}>
                      <circle cx={ox} cy={octY} r={btnR}
                        fill={isSelected ? '#06b6d4' : '#1e293b'}
                        stroke={isSelected ? '#22d3ee' : '#475569'}
                        strokeWidth={isSelected ? 2 : 1}
                        style={{ filter: isSelected ? 'drop-shadow(0 0 4px #06b6d4)' : 'none' }}
                      />
                      <text x={ox} y={octY} textAnchor="middle" dominantBaseline="central"
                        fontSize={7} fontWeight="800"
                        fill={isSelected ? '#fff' : '#64748b'}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {oct}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          <ChordWheel
            cx={lCx} cy={cy} radius={r}
            chordTypeIdx={selectedChordType}
            activeChordIdx={activeChordIdx}
            gamepadHighlight={gpChordIdx}
            onChordDown={handleChordDown}
            onChordUp={handleChordUp}
            innerR={innerR}
          />

          <NoteWheel
            cx={rCx} cy={cy} radius={r}
            notes={wheelNotes}
            activeNoteSet={activeNoteNames}
            gamepadHighlight={gpNoteIdx}
            onNoteDown={handleNoteDown}
            onNoteUp={handleNoteUp}
            innerR={innerR}
          />

          {/* Live feedback label */}
          {(activeChordLabel || activeNoteName) && (
            <text x={svgW / 2} y={svgH - 14}
              textAnchor="middle" fontSize={13} fontWeight="800" fill="#facc15"
              style={{ userSelect: 'none' }}>
              {activeChordLabel ?? activeNoteName}
            </text>
          )}
        </svg>
      </div>

      {/* Controls legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-slate-500">
        <span><span className="font-bold text-slate-300">L-stick</span> → chord</span>
        <span><span className="font-bold text-slate-300">R-stick</span> → note</span>
        <span><span className="font-bold text-slate-300">A</span> → oct −</span>
        <span><span className="font-bold text-slate-300">B</span> → oct +</span>
        <span><span className="font-bold text-slate-300">◄►</span> → chord type</span>
        <span><span className="font-bold text-slate-300">RB</span> → hold semitones</span>
      </div>

      <div className="flex items-center gap-5 text-[11px] text-slate-400">
        <span>Scale: <span className="font-bold text-cyan-300">{SCALES[selectedScale]?.label ?? selectedScale}</span></span>
        <span>Key: <span className="font-bold text-cyan-300">{selectedKey}</span></span>
        <span>Oct: <span className="font-bold text-cyan-300">{selectedOctave}</span></span>
      </div>
    </div>
  );
}
