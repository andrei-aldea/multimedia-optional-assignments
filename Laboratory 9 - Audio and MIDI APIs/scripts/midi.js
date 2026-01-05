window.onload = function () {
    var emulatedKeys = {
        q: 60, 2: 61, w: 62, 3: 63, e: 64,
        r: 65, 5: 66, t: 67, 6: 68, y: 69,
        7: 70, u: 71, i: 72
    }

    let pianoSounds = new Array(256).fill(null);
    let oscillators = new Array(256).fill(null);

    for (let midiCode = 36; midiCode <= 96; midiCode++) {
        let noteName = document
            .querySelector(`[data-midi-code="${midiCode}"]`)
            .getAttribute('data-note');

        let audio = new Audio(`../notes/${noteName}.mp3`);
        pianoSounds[midiCode] = audio;

        let audioContext = new AudioContext();
        let oscillator = audioContext.createOscillator();
        let frequency = Math.pow(2, (midiCode - 69) / 12) * 440;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sawtooth';

        oscillator.connect(audioContext.destination);
        oscillator.start();

        oscillators[midiCode] = audioContext;
    }

    function playPianoSound(midiCode) {
        pianoSounds[midiCode].play();
    }

    function stopPianoSound(midiCode) {
        pianoSounds[midiCode].pause();
        pianoSounds[midiCode].currentTime = 0;

    }

    function playOscillator(midiCode) {
        oscillators[midiCode].resume();
    }

    function stopOscillator(midiCode) {
        oscillators[midiCode].suspend();
    }

    document.addEventListener('keydown', function (e) {
        let key = e.key.toLowerCase();
        if (emulatedKeys.hasOwnProperty(key)) {
            //playPianoSound(emulatedKeys[key]);
            playOscillator(emulatedKeys[key]);
            document
                .querySelector(`[data-midi-code="${emulatedKeys[key]}"]`)
                .classList.add('activeKey');
        }
    })

    document.addEventListener('keyup', function (e) {
        let key = e.key.toLowerCase();
        if (emulatedKeys.hasOwnProperty(key)) {
            // stopPianoSound(emulatedKeys[key]);
            stopOscillator(emulatedKeys[key])
            document
                .querySelector(`[data-midi-code="${emulatedKeys[key]}"]`)
                .classList.remove('activeKey');
        }
    })

    navigator.requestMIDIAccess().then((access) => {
        access.inputs.forEach((input) => {
            input.open().then(() => {
                input.onmidimessage = function (m) {
                    let code = m.data[0];
                    if (code == 144) {
                        if (m.data[2] > 0) {
                            playPianoSound(m.data[1]);
                        }
                        else {
                            stopPianoSound(m.data[1]);
                        }
                    }
                }
            })
        })
    })
}