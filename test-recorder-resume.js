import * as Tone from 'tone';

async function test() {
  const recorder = new Tone.Recorder();
  recorder.start();
  console.log("State after start:", recorder.state);
  recorder.pause();
  console.log("State after pause:", recorder.state);
  try {
    // start() calls _recorder.start() because state is "stopped", which throws if MediaRecorder is "paused"
    await recorder.start();
    console.log("Resume succeeded");
  } catch (e) {
    console.log("Resume failed:", e.message);
  }
}
test();
