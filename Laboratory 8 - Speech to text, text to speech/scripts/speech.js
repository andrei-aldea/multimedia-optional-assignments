class GameApp {
	constructor() {
		this.synth = window.speechSynthesis
		this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
		this.recognition.lang = 'en-US'
		this.recognition.interimResults = false
		this.recognition.maxAlternatives = 1

		// State
		this.targetNumber = 0
		this.minRange = 0
		this.maxRange = 100
		this.guesses = 0
		this.isListening = false
		this.continuousMode = false
		this.history = []
		this.startTime = 0
		this.wins = 0
		this.bestScore = Infinity

		// Config
		this.difficulty = 'medium' // easy, medium, hard
		this.voice = null
		this.rate = 1
		this.pitch = 1

		// Elements
		this.canvas = document.getElementById('rangeCanvas')
		this.ctx = this.canvas.getContext('2d')

		this.textMap = {
			zero: 0,
			one: 1,
			two: 2,
			three: 3,
			four: 4,
			five: 5,
			six: 6,
			seven: 7,
			eight: 8,
			nine: 9,
			ten: 10
		}

		this.init()
	}

	init() {
		this.bindEvents()
		setTimeout(() => this.populateVoices(), 500) // Give browser time to load voices
		this.startNewGame()
	}

	bindEvents() {
		// Recognition Events
		this.recognition.onstart = () => {
			this.isListening = true
			document.getElementById('btnMic').classList.add('listening')
			document.getElementById('feedbackMsg').textContent = 'Listening...'
		}

		this.recognition.onend = () => {
			this.isListening = false
			document.getElementById('btnMic').classList.remove('listening')
			if (this.continuousMode && !this.gameWon) {
				this.recognition.start()
			} else if (!this.gameWon) {
				document.getElementById('feedbackMsg').textContent = 'Press Mic to Speak'
			}
		}

		this.recognition.onresult = (e) => this.handleSpeechResult(e)
		this.recognition.onerror = (e) => {
			console.error(e.error)
			this.speak("I didn't catch that.")
		}

		// UI Controls
		document.getElementById('btnMic').onclick = () => {
			if (this.isListening) this.recognition.stop()
			else this.recognition.start()
		}

		document.getElementById('btnGiveUp').onclick = () => this.endGame(false)
		document.getElementById('chkContinuous').onchange = (e) => (this.continuousMode = e.target.checked)

		// Settings Changes
		document.getElementById('selDifficulty').onchange = (e) => {
			this.difficulty = e.target.value
			this.startNewGame()
		}

		document.getElementById('selLang').onchange = (e) => {
			this.recognition.lang = e.target.value
			// Also try to find a matching voice
			const matchingVoice = this.voices.find((v) => v.lang.startsWith(e.target.value))
			if (matchingVoice) {
				this.voice = matchingVoice
				document.getElementById('selVoice').value = matchingVoice.name
			}
		}

		document.getElementById('selVoice').onchange = (e) => {
			this.voice = this.voices.find((v) => v.name === e.target.value)
		}

		;['rngRate', 'rngPitch'].forEach((id) => {
			document.getElementById(id).addEventListener('input', (e) => {
				this[id === 'rngRate' ? 'rate' : 'pitch'] = parseFloat(e.target.value)
				document.getElementById(id === 'rngRate' ? 'valRate' : 'valPitch').textContent = e.target.value
			})
		})
	}

	populateVoices() {
		this.voices = this.synth.getVoices()
		const sel = document.getElementById('selVoice')
		sel.innerHTML = ''
		this.voices.forEach((v) => {
			const opt = document.createElement('option')
			opt.value = v.name
			opt.textContent = `${v.name} (${v.lang})`
			sel.appendChild(opt)
		})
		if (this.voices.length > 0) this.voice = this.voices[0]

		// Setup initial voice
		this.synth.onvoiceschanged = () => this.populateVoices()
	}

	startNewGame() {
		this.gameWon = false
		this.guesses = 0
		this.history = []
		this.startTime = Date.now()
		document.getElementById('guessHistory').innerHTML = ''
		document.getElementById('lastGuess').textContent = '-'

		// specific ranges
		if (this.difficulty === 'easy') this.maxRange = 50
		else if (this.difficulty === 'medium') this.maxRange = 100
		else this.maxRange = 1000

		this.minRange = 0
		this.targetNumber = Math.floor(Math.random() * (this.maxRange + 1))

		this.drawCanvas()
		this.updateUI('New Game Started!', `Range: 0 - ${this.maxRange}`)
		this.speak('New game started. Good luck!')
	}

	handleSpeechResult(event) {
		const transcript = event.results[0][0].transcript.toLowerCase().trim()
		console.log('Heard:', transcript)

		// Commands
		if (transcript.includes('give up') || transcript.includes('surrender')) {
			this.endGame(false)
			return
		}
		if (transcript.includes('new game') || transcript.includes('restart')) {
			this.startNewGame()
			return
		}

		// Parse Number
		let guess = parseInt(transcript)
		if (isNaN(guess)) {
			// Text to Number fallback
			if (this.textMap[transcript] !== undefined) guess = this.textMap[transcript]
			else {
				this.speak('Invalid number.')
				return
			}
		}

		// Logic
		this.processGuess(guess)
	}

	processGuess(guess) {
		this.guesses++
		document.getElementById('lastGuess').textContent = guess

		if (guess === this.targetNumber) {
			this.endGame(true)
		} else {
			let hint = guess > this.targetNumber ? 'Too High' : 'Too Low'

			// Smart Hint
			const diff = Math.abs(guess - this.targetNumber)
			let temp = 'Cold'
			if (diff <= 5) temp = 'Hot!'
			else if (diff <= 15) temp = 'Warm'

			// Narrow Range Visuals
			if (guess > this.targetNumber && guess < this.maxRange) this.maxRange = guess
			if (guess < this.targetNumber && guess > this.minRange) this.minRange = guess

			const msg = `${hint}. ${temp}.`
			this.updateUI(msg, `Range: ${this.minRange} - ${this.maxRange}`)
			this.addToHistory(guess, hint)
			this.speak(msg)
			this.drawCanvas()
		}
	}

	endGame(won) {
		this.gameWon = true
		this.continuousMode = false // Stop continuous
		document.getElementById('chkContinuous').checked = false

		if (won) {
			this.wins++
			if (this.guesses < this.bestScore) this.bestScore = this.guesses

			document.getElementById('statWins').textContent = this.wins
			document.getElementById('statBest').textContent = this.bestScore

			const msg = `Correct! The number was ${this.targetNumber}. You won in ${this.guesses} attempts.`
			this.updateUI('YOU WON! 🎉', 'Press Speak to start new game')
			this.speak(msg)
		} else {
			const msg = `Game Over. The number was ${this.targetNumber}.`
			this.updateUI('Gave Up 🏳️', `Target: ${this.targetNumber}`)
			this.speak(msg)
		}
	}

	drawCanvas() {
		const w = this.canvas.width
		const h = this.canvas.height
		this.ctx.clearRect(0, 0, w, h)

		// Base Bar
		this.ctx.fillStyle = '#444'
		this.ctx.fillRect(0, 20, w, 40)

		// Valid Range Highlight
		if (this.difficulty !== 'hard') {
			// Hard mode hides visuals? Or scale is too big? Let's show it anyway but scaled
			let totalRange = this.difficulty === 'easy' ? 50 : this.difficulty === 'medium' ? 100 : 1000

			let startX = (this.minRange / totalRange) * w
			let endX = (this.maxRange / totalRange) * w

			this.ctx.fillStyle = '#4dabf7'
			this.ctx.fillRect(startX, 20, endX - startX, 40)

			// Text Labels
			this.ctx.fillStyle = '#fff'
			this.ctx.font = '14px sans-serif'
			this.ctx.fillText(this.minRange, startX, 75)
			this.ctx.fillText(this.maxRange, endX - 10, 75)
		}
	}

	addToHistory(guess, result) {
		const list = document.getElementById('guessHistory')
		const li = document.createElement('li')
		li.className = result.toLowerCase().includes('high') ? 'high' : 'low'
		li.innerHTML = `<span>You said: <b>${guess}</b></span> <span>${result}</span>`
		list.prepend(li)
	}

	updateUI(main, sub) {
		document.getElementById('feedbackMsg').textContent = main
		if (sub) document.getElementById('hintMsg').textContent = sub
	}

	speak(text) {
		if (this.synth.speaking) this.synth.cancel()
		const utter = new SpeechSynthesisUtterance(text)
		if (this.voice) utter.voice = this.voice
		utter.rate = this.rate
		utter.pitch = this.pitch
		utter.lang = this.recognition.lang
		this.synth.speak(utter)
	}
}

window.onload = function () {
	new GameApp()
}
