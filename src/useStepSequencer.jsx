import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

/**
 * A drop-in hook to record a sequence of note clicks and play them back
 * quantized to a strict BPM grid.
 * 
 * @param {React.MutableRefObject} instrumentRef - A ref pointing to the Tone.js instrument.
 */
export function useStepSequencer(instrumentRef) {
  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  
  const toneSequenceRef = useRef(null);

  // Add note to the recorded sequence
  const recordStep = (noteId) => {
    // Optional: only record if we aren't currently playing back
    if (!isPlaying) {
      setSequence((prev) => [...prev, noteId]);
    }
  };

  const clearSequence = () => {
    setSequence([]);
  };

  const undoStep = () => {
    if (!isPlaying) {
      setSequence((prev) => prev.slice(0, -1));
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      Tone.Transport.stop();
      setIsPlaying(false);
    } else {
      if (sequence.length === 0) return;
      
      // Ensure audio context is started
      await Tone.start();
      
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  // Synchronize Tone.Sequence whenever the sequence array changes
  useEffect(() => {
    if (toneSequenceRef.current) {
      toneSequenceRef.current.dispose();
      toneSequenceRef.current = null;
    }

    if (sequence.length > 0) {
      toneSequenceRef.current = new Tone.Sequence(
        (time, noteId) => {
          if (instrumentRef.current) {
            try {
              // Use an 8th note duration. Adjust '8n' if you want shorter/longer staccato steps.
              instrumentRef.current.triggerAttackRelease(noteId, '8n', time);
            } catch (err) {
              console.warn('Sequencer playback error:', err);
            }
          }
        },
        sequence,
        '8n' // Play speed: each step is evaluated as an 8th note length
      ).start(0);
    }

    return () => {
      if (toneSequenceRef.current) {
        toneSequenceRef.current.dispose();
      }
    };
  }, [sequence, instrumentRef]);

  // Update BPM in real-time
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Ensure Tone.Transport stops if the component unmounts
  useEffect(() => {
    return () => {
      Tone.Transport.stop();
    };
  }, []);

  return {
    sequence,
    isPlaying,
    bpm,
    setBpm,
    recordStep,
    clearSequence,
    undoStep,
    togglePlayback
  };
}

/**
 * Drop-in UI component to control the sequencer.
 * 
 * @param {Object} props
 * @param {Object} props.sequencer - The object returned by useStepSequencer()
 */
export function SequencerControls({ sequencer }) {
  const { sequence, isPlaying, bpm, setBpm, clearSequence, undoStep, togglePlayback } = sequencer;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-slate-800/80 px-3 py-2 shadow-lg backdrop-blur">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Arpeggiator</span>
        <span className="text-xs font-semibold text-slate-300">{sequence.length} steps</span>
      </div>

      <button
        onClick={togglePlayback}
        disabled={sequence.length === 0}
        className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-bold transition-all duration-200 ${
          isPlaying 
            ? 'animate-pulse bg-purple-500 text-white shadow-lg shadow-purple-500/50 hover:bg-purple-400' 
            : 'bg-slate-700 text-purple-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50'
        }`}
      >
        {isPlaying ? 'Stop' : 'Play Rhythm'}
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-300">BPM</label>
        <input 
          type="number" 
          value={bpm} 
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-16 rounded-md bg-slate-900 px-2 py-1 text-sm font-medium text-white shadow-inner outline-none focus:ring-2 focus:ring-purple-500/50"
          min="40"
          max="300"
        />
      </div>

      <button
        onClick={undoStep}
        disabled={isPlaying || sequence.length === 0}
        className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/20 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Undo
      </button>

      <button
        onClick={clearSequence}
        disabled={isPlaying || sequence.length === 0}
        className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear
      </button>
    </div>
  );
}
