const context = new (window.AudioContext || window.webkitAudioContext)();

const oscillator = context.createOscillator();
oscillator.frequency.setValueAtTime(440, context.currentTime);
oscillator.type = "sine";
const envelope = context.createGain();
oscillator.connect(envelope);
envelope.connect(context.destination);
envelope.gain.value = 6.0;
oscillator.start();
