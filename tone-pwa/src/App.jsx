import { useState, useRef } from 'react';
import * as Tone from 'tone';
import './App.css';

function App() {
  // Track whether the user has granted audio permissions
  const [isReady, setIsReady] = useState(false);
  
  // Use a ref to store our synthesizer instance so it persists across renders
  const synthRef = useRef(null);

  const initializeAudio = async () => {
    // Tone.start() must be called in response to a user action
    await Tone.start();
    console.log('Audio context is ready');
    
    // Initialize a basic synthesizer and route it to the main output
    synthRef.current = new Tone.Synth().toDestination();
    
    setIsReady(true);
  };

  const playNote = (note) => {
    if (isReady && synthRef.current) {
      // Trigger a note for the duration of an 8th note
      synthRef.current.triggerAttackRelease(note, "8n");
    }
  };

  return (
    <div className="App" style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>React + Tone.js PWA</h1>
      
      {!isReady ? (
        <div>
          <p>Browsers require user interaction before playing audio.</p>
          <button 
            onClick={initializeAudio} 
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            Start Audio Engine
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: 'green' }}>Audio engine is running!</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button onClick={() => playNote("C4")} style={{ padding: '20px' }}>C4</button>
            <button onClick={() => playNote("E4")} style={{ padding: '20px' }}>E4</button>
            <button onClick={() => playNote("G4")} style={{ padding: '20px' }}>G4</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;