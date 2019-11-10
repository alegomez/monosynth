import "./main.css";
const context = new (window.AudioContext || window.webkitAudioContext)();
let midiAccess = null;

const onMIDIInit = midi => {
  midiAccess = midi;

  let haveAtLeastOneDevice = false;
  const inputs = midiAccess.inputs.values();
  for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
    input.value.onmidimessage = MIDIMessageEventHandler;
    haveAtLeastOneDevice = true;
  }
  if (!haveAtLeastOneDevice) alert("No MIDI input devices present");
};

const onMIDIReject = err => {
  alert(`MIDI rejected with errpr ${err}`);
};

if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(onMIDIInit, onMIDIReject);
} else {
  alert("MIDI not supported");
}

// const compressor = context.createDynamicsCompressor();
// compressor.threshold.setValueAtTime(-50, context.currentTime);
// compressor.knee.setValueAtTime(40, context.currentTime);
// compressor.ratio.setValueAtTime(12, context.currentTime);
// compressor.attack.setValueAtTime(0, context.currentTime);
// compressor.release.setValueAtTime(0.25, context.currentTime);

const biquadFilter = context.createBiquadFilter();

const envelope = context.createGain();
const analyser = context.createAnalyser();

envelope.gain.value = 0.0;

let attack = 0.1;
let decay = 0.1;
let release = 0.1;
let sustain = 0.1;
const portamento = 0.0; // portamento/glide speed

const normaliseVal = (v, max = 100) => {
  return v === 0 ? 0.01 : v / max;
};

// UI
const oscTypeSelector = document.querySelector("#type");
oscTypeSelector.onchange = e => {
  oscillator.type = e.target.value;
};

const attackSlider = document.querySelector("#attack");
attackSlider.value = attack * 100;
attackSlider.oninput = e => {
  attack = normaliseVal(e.target.valueAsNumber);
};

const decaySlider = document.querySelector("#decay");
decaySlider.value = decay * 100;
decaySlider.oninput = e => {
  decay = normaliseVal(e.target.valueAsNumber);
};

const sustainSlider = document.querySelector("#sustain");
sustainSlider.value = sustain * 100;
sustainSlider.oninput = e => {
  sustain = normaliseVal(e.target.valueAsNumber);
};

const releaseSlider = document.querySelector("#release");
releaseSlider.value = sustain * 100;
releaseSlider.oninput = e => {
  release = normaliseVal(e.target.valueAsNumber);
};

// oscillator
const oscillator = context.createOscillator();
oscillator.type = oscTypeSelector.value;

// circuitry
oscillator.connect(biquadFilter);
biquadFilter.connect(envelope);
envelope.connect(analyser);
analyser.connect(context.destination);
oscillator.start(0);

biquadFilter.type = "lowpass";
biquadFilter.frequency.setValueAtTime(500, context.currentTime);
biquadFilter.gain.setValueAtTime(25, context.currentTime);

const frequencyFromNoteNumber = note => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

const noteOn = noteNumber => {
  oscillator.frequency.cancelScheduledValues(0);
  oscillator.frequency.setTargetAtTime(
    frequencyFromNoteNumber(noteNumber),
    0,
    portamento
  );
  envelope.gain.cancelScheduledValues(0);
  envelope.gain.linearRampToValueAtTime(sustain, context.currentTime + attack);
  envelope.gain.linearRampToValueAtTime(
    sustain,
    context.currentTime + attack + decay
  );
};

const noteOff = () => {
  envelope.gain.cancelScheduledValues(0);
  envelope.gain.setTargetAtTime(0.0, 0, release);
};

const MIDIMessageEventHandler = event => {
  switch (event.data[0]) {
    case 144:
      if (event.data[2] !== 0) {
        noteOn(event.data[1]);
        return;
      }
    case 128:
      noteOff();
      return;
    case 176:
      const normalised = normaliseVal(event.data[2]);
      switch (event.data[1]) {
        case 80:
          attack = normalised;
          attackSlider.value = normalised * 100;
          return;
        case 82:
          decay = normalised;
          decaySlider.value = normalised * 100;
          return;
        case 84:
          sustain = normalised;
          sustainSlider.value = normalised * 100;
          return;
        case 86:
          release = normalised;
          releaseSlider.value = normalised * 100;
          return;
      }
  }
};

analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth - 16;
canvas.height = 300;
const canvasCtx = canvas.getContext("2d");

const draw = () => {
  const WIDTH = window.innerWidth - 16;
  const HEIGHT = 300;
  requestAnimationFrame(draw);
  analyser.getByteTimeDomainData(dataArray);
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(124,252,0)";
  canvasCtx.beginPath();
  const sliceWidth = (WIDTH * 1.0) / bufferLength;
  let x = 0;
  dataArray.forEach((d, i) => {
    const y = ((d / 128.0) * HEIGHT) / 2;
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  });
  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
};

draw();
