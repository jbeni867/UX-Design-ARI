import { useState, useRef } from 'react';
import * as Tone from 'tone';
import './App.css';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [octave, setOctave] = useState(4);
  const [synthType, setSynthType] = useState('Synth');
  
  const synthRef = useRef(null);

  // Define a C Major scale
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];

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
      synthRef.current.dispose();
    }

    // Create the new synth based on the selected type
    switch (type) {
      case 'FMSynth':
        // FMSynth is great for brassy or bell-like sounds
        synthRef.current = new Tone.FMSynth().toDestination();
        break;
      case 'AMSynth':
        // AMSynth has a slightly more harmonic, classic sci-fi feel
        synthRef.current = new Tone.AMSynth().toDestination();
        break;
      case 'Synth':
      default:
        // The standard basic oscillator
        synthRef.current = new Tone.Synth().toDestination();
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

  const playNote = (noteName, index) => {
    if (isReady && synthRef.current) {
      // If it's the 8th note (the final 'C'), push it up one octave to complete the scale
      const currentOctave = index === 7 ? octave + 1 : octave;
      synthRef.current.triggerAttackRelease(`${noteName}${currentOctave}`, "8n");
    }
  };

  return (
    <div className="App" style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>React + Tone.js PWA</h1>
      
      {!isReady ? (
        <div>
          <p>Browsers require user interaction before playing audio.</p>
          <button 
            onClick={initializeAudio} 
            style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', borderRadius: '8px' }}
          >
            Start Audio Engine
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#2ecc71', fontWeight: 'bold' }}>Audio engine is running!</p>
          
          {/* Controls Menu */}
          <div style={{ 
            marginBottom: '30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            background: '#2c3e50', 
            color: 'white',
            padding: '15px', 
            borderRadius: '8px' 
          }}>
            
            {/* Instrument Selector */}
            <div>
              <label htmlFor="synth-select" style={{ marginRight: '10px' }}>Instrument:</label>
              <select id="synth-select" value={synthType} onChange={handleSynthChange} style={{ padding: '5px', borderRadius: '4px' }}>
                <option value="Synth">Basic Synth</option>
                <option value="FMSynth">FM Synth</option>
                <option value="AMSynth">AM Synth</option>
              </select>
            </div>
            
            {/* Octave Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => setOctave(o => Math.max(1, o - 1))} 
                disabled={octave <= 1}
                style={{ padding: '5px 10px', cursor: 'pointer' }}
              >
                - Oct
              </button>
              <span style={{ fontWeight: 'bold', width: '80px' }}>Octave: {octave}</span>
              <button 
                onClick={() => setOctave(o => Math.min(7, o + 1))} 
                disabled={octave >= 7}
                style={{ padding: '5px 10px', cursor: 'pointer' }}
              >
                + Oct
              </button>
            </div>
          </div>

          {/* Piano Keys */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            {notes.map((note, index) => {
              const displayOctave = index === 7 ? octave + 1 : octave;
              return (
                <button 
                  key={`${note}-${index}`} 
                  // Using onMouseDown instead of onClick makes the response feel much faster!
                  onMouseDown={() => playNote(note, index)}
                  style={{ 
                    padding: '40px 15px 20px 15px', 
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    minWidth: '60px',
                    background: 'white',
                    color: 'black',
                    border: '1px solid #ccc',
                    borderRadius: '0 0 8px 8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {note}{displayOctave}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;