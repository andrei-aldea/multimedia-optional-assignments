class PianoApp {
	constructor() {
		this.ctx = new (window.AudioContext || window.webkitAudioContext)()
		this.masterGain = this.ctx.createGain()
		this.analyser = this.ctx.createAnalyser()

		// Connections
		this.masterGain.connect(this.analyser)
		this.analyser.connect(this.ctx.destination)

		// Config
		this.masterGain.gain.value = 0.5
		this.waveform = 'sawtooth'
		this.octaveShift = 0 // 0 = default (C4 at Q)
		this.activeOscillators = {} // midiCode -> {osc, gain}

		// Recording
		this.isRecording = false
		this.recordedEvents = []
		this.recordingStartTime = 0

		// Expanded Key Map (Lower Row: Z.., Upper Row: Q..)
		this.keyMap = {
			// Lower Octave (starts at C3 with Shift=0)
			z: 48,
			s: 49,
			x: 50,
			d: 51,
			c: 52,
			v: 53,
			g: 54,
			b: 55,
			h: 56,
			n: 57,
			j: 58,
			m: 59,
			// Upper Octave (starts at C4 with Shift=0)
			q: 60,
			2: 61,
			w: 62,
			3: 63,
			e: 64,
			r: 65,
			5: 66,
			t: 67,
			6: 68,
			y: 69,
			7: 70,
			u: 71,
			i: 72,
			9: 73,
			o: 74,
			0: 75,
			p: 76
		}

		this.init()
	}

	init() {
		this.bindEvents()
		this.setupVisualizer()
		this.setupMIDI()
	}

	playNote(midiCode) {
		if (this.activeOscillators[midiCode]) return // Already playing

		// Frequency Calc
		const freq = Math.pow(2, (midiCode - 69) / 12) * 440

		const osc = this.ctx.createOscillator()
		const noteGain = this.ctx.createGain()

		osc.type = this.waveform
		osc.frequency.setValueAtTime(freq, this.ctx.currentTime)

		// Envelope (Attack)
		noteGain.gain.setValueAtTime(0, this.ctx.currentTime)
		noteGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.01)

		osc.connect(noteGain)
		noteGain.connect(this.masterGain)

		osc.start()

		this.activeOscillators[midiCode] = { osc, noteGain }

		// Visuals
		this.highlightKey(midiCode, true)

		// Record
		if (this.isRecording) {
			this.recordedEvents.push({
				midi: midiCode,
				type: 'on',
				time: this.ctx.currentTime - this.recordingStartTime
			})
		}
	}

	stopNote(midiCode) {
		const voice = this.activeOscillators[midiCode]
		if (!voice) return

		// Envelope (Release)
		const release = 0.1
		voice.noteGain.gain.cancelScheduledValues(this.ctx.currentTime)
		voice.noteGain.gain.setValueAtTime(voice.noteGain.gain.value, this.ctx.currentTime)
		voice.noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + release)
		voice.osc.stop(this.ctx.currentTime + release)

		delete this.activeOscillators[midiCode]

		// Visuals
		this.highlightKey(midiCode, false)

		// Record
		if (this.isRecording) {
			this.recordedEvents.push({
				midi: midiCode,
				type: 'off',
				time: this.ctx.currentTime - this.recordingStartTime
			})
		}
	}

	highlightKey(midiCode, active) {
		const key = document.querySelector(`[data-midi-code="${midiCode}"]`)
		if (key) {
			if (active) key.classList.add('activeKey')
			else key.classList.remove('activeKey')
		}
	}

	playRecording() {
		if (this.recordedEvents.length === 0) return

		this.recordedEvents.forEach((e) => {
			const time = this.ctx.currentTime + e.time
			setTimeout(() => {
				if (e.type === 'on') this.playNote(e.midi)
				else this.stopNote(e.midi)
			}, e.time * 1000)
		})
	}

	bindEvents() {
		// Keyboard
		document.addEventListener('keydown', (e) => {
			if (e.repeat) return
			const key = e.key.toLowerCase()
			if (this.keyMap[key]) {
				// App Octave Shift
				let code = this.keyMap[key] + this.octaveShift * 12
				this.playNote(code)
			}
		})

		document.addEventListener('keyup', (e) => {
			const key = e.key.toLowerCase()
			if (this.keyMap[key]) {
				let code = this.keyMap[key] + this.octaveShift * 12
				this.stopNote(code)
			}
		})

		// Mouse (All Keys)
		document.querySelectorAll('.key').forEach((key) => {
			const code = parseInt(key.getAttribute('data-midi-code'))

			key.addEventListener('mousedown', () => this.playNote(code))
			key.addEventListener('mouseup', () => this.stopNote(code))
			key.addEventListener('mouseleave', () => this.stopNote(code))
		})

		// Controls
		document.getElementById('volSlider').addEventListener('input', (e) => {
			this.masterGain.gain.value = parseFloat(e.target.value)
		})

		document.getElementById('waveSelect').addEventListener('change', (e) => {
			this.waveform = e.target.value
		})

		document.getElementById('btnOctDown').addEventListener('click', () => {
			this.octaveShift--
			this.updateOctaveDisplay()
		})

		document.getElementById('btnOctUp').addEventListener('click', () => {
			this.octaveShift++
			this.updateOctaveDisplay()
		})

		document.getElementById('btnToggleLabels').addEventListener('click', () => {
			document.querySelector('.keyboard').classList.toggle('hide-labels')
		})

		// Recorder
		document.getElementById('btnRecord').addEventListener('click', (e) => {
			this.isRecording = !this.isRecording
			e.target.classList.toggle('recording')
			if (this.isRecording) {
				this.recordedEvents = []
				this.recordingStartTime = this.ctx.currentTime
				e.target.textContent = '● Rec (On)'
			} else {
				e.target.textContent = '● Rec'
			}
		})

		document.getElementById('btnStopRec').addEventListener('click', () => {
			this.isRecording = false
			document.getElementById('btnRecord').classList.remove('recording')
			document.getElementById('btnRecord').textContent = '● Rec'
			// Stop all sounds
			Object.keys(this.activeOscillators).forEach((k) => this.stopNote(k))
		})

		document.getElementById('btnPlayRec').addEventListener('click', () => this.playRecording())
	}

	updateOctaveDisplay() {
		const base = 4 + this.octaveShift
		document.getElementById('currentOctave').textContent = `C${base}`
	}

	setupMIDI() {
		if (!navigator.requestMIDIAccess) return
		navigator.requestMIDIAccess().then((access) => {
			const inputs = access.inputs.values()
			for (let input of inputs) {
				input.onmidimessage = (m) => {
					const [command, note, velocity] = m.data
					if (command === 144 && velocity > 0) this.playNote(note)
					if (command === 128 || (command === 144 && velocity === 0)) this.stopNote(note)
				}
			}
		})
	}

	setupVisualizer() {
		const canvas = document.getElementById('visualizer')
		const ctx = canvas.getContext('2d')
		const bufferLength = this.analyser.frequencyBinCount
		const dataArray = new Uint8Array(bufferLength)

		const draw = () => {
			requestAnimationFrame(draw)
			this.analyser.getByteFrequencyData(dataArray)

			ctx.fillStyle = '#111'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			const barWidth = (canvas.width / bufferLength) * 2.5
			let x = 0

			for (let i = 0; i < bufferLength; i++) {
				const barHeight = dataArray[i] / 2
				ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`
				ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
				x += barWidth + 1
			}
		}
		draw()
	}
}

window.onload = function () {
	// Resume context on user interaction if needed
	document.body.addEventListener(
		'click',
		function () {
			if (new (window.AudioContext || window.webkitAudioContext)().state === 'suspended') {
				new (window.AudioContext || window.webkitAudioContext)().resume()
			}
		},
		{ once: true }
	)

	new PianoApp()
}
