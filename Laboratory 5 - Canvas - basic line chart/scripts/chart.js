class ChartApp {
	constructor() {
		this.canvas = document.getElementById('chartCanvas')
		this.ctx = this.canvas.getContext('2d')
		this.width = this.canvas.width
		this.height = this.canvas.height
		this.tooltip = document.getElementById('tooltip')

		// Config State
		this.isPlaying = true
		this.smooth = false
		this.showGrid = true
		this.chartType = 'line'
		this.updateSpeed = 1000
		this.maxValue = 600

		// Data State
		this.valueIncrement = 20
		this.maxPoints = Math.ceil(this.width / this.valueIncrement)
		this.dataA = []
		this.dataB = []

		// Colors (will be updated from CSS var)
		this.colors = {
			grid: 'gray',
			lineA: 'green',
			lineB: 'blue',
			text: 'black'
		}

		this.init()
	}

	init() {
		this.generateInitialData()
		this.bindEvents()
		this.updateColors()
		this.loop()
	}

	generateInitialData() {
		this.dataA = Array(this.maxPoints)
			.fill(0)
			.map(() => this.getRandomVal())
		this.dataB = Array(this.maxPoints)
			.fill(0)
			.map(() => this.getRandomVal())
	}

	getRandomVal() {
		return Math.floor(Math.random() * this.maxValue)
	}

	updateColors() {
		const style = getComputedStyle(document.body)
		this.colors.grid = style.getPropertyValue('--grid-color').trim()
		this.colors.lineA = style.getPropertyValue('--line-a').trim()
		this.colors.lineB = style.getPropertyValue('--line-b').trim()
		this.colors.text = style.getPropertyValue('--text-color').trim()
	}

	bindEvents() {
		// Play/Pause
		document.getElementById('btnPlayPause').addEventListener('click', (e) => {
			this.isPlaying = !this.isPlaying
			e.target.textContent = this.isPlaying ? 'Pause' : 'Resume'
		})

		// Reset
		document.getElementById('btnReset').addEventListener('click', () => {
			this.generateInitialData()
			this.draw()
		})

		// Export
		document.getElementById('btnExport').addEventListener('click', () => {
			const link = document.createElement('a')
			link.download = 'chart.png'
			link.href = this.canvas.toDataURL()
			link.click()
		})

		// Speed
		document.getElementById('rngSpeed').addEventListener('input', (e) => {
			this.updateSpeed = parseInt(e.target.value)
			document.getElementById('valSpeed').textContent = this.updateSpeed
			this.resetInterval()
		})

		// Max Value
		document.getElementById('inpMax').addEventListener('change', (e) => {
			this.maxValue = parseInt(e.target.value) || 600
		})

		// Grid Toggle
		document.getElementById('chkGrid').addEventListener('change', (e) => {
			this.showGrid = e.target.checked
			this.draw()
		})

		// Smooth Toggle
		document.getElementById('chkSmooth').addEventListener('change', (e) => {
			this.smooth = e.target.checked
			this.draw()
		})

		// Chart Type
		document.getElementById('selChartType').addEventListener('change', (e) => {
			this.chartType = e.target.value
			this.draw()
		})

		// Theme
		document.getElementById('selTheme').addEventListener('change', (e) => {
			document.body.setAttribute('data-theme', e.target.value)
			this.updateColors()
			this.draw()
		})

		// Tooltip Hover
		this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
		this.canvas.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'))
	}

	resetInterval() {
		if (this.timer) clearInterval(this.timer)
		this.timer = setInterval(() => {
			if (this.isPlaying) {
				this.updateData()
				this.draw()
				this.updateStats()
			}
		}, this.updateSpeed)
	}

	loop() {
		this.resetInterval()
		this.draw()
		this.updateStats()
	}

	updateData() {
		// Shift old, push new
		this.dataA.shift()
		this.dataA.push(this.getRandomVal())

		this.dataB.shift()
		this.dataB.push(this.getRandomVal())
	}

	draw() {
		// Clear
		this.ctx.clearRect(0, 0, this.width, this.height)

		// Grid & Labels
		if (this.showGrid) {
			this.drawExampleGrid()
		}

		// Draw Series
		this.drawSeries(this.dataB, this.colors.lineB)
		this.drawSeries(this.dataA, this.colors.lineA)
	}

	drawSeries(data, color) {
		this.ctx.globalAlpha = this.chartType === 'area' ? 0.6 : 1
		this.ctx.strokeStyle = color
		this.ctx.fillStyle = color
		this.ctx.lineWidth = 3

		// Path Construction
		this.ctx.beginPath()

		if (this.chartType === 'line' || this.chartType === 'area') {
			if (this.smooth) {
				// simple curve strategy
				this.ctx.moveTo(0, this.height - data[0])
				for (let i = 0; i < data.length - 1; i++) {
					let x = i * this.valueIncrement
					let y = this.height - data[i]
					let nextX = (i + 1) * this.valueIncrement
					let nextY = this.height - data[i + 1]
					let cp1x = x + (nextX - x) / 2
					let cp1y = y
					let cp2x = x + (nextX - x) / 2
					let cp2y = nextY
					this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY)
				}
			} else {
				this.ctx.moveTo(0, this.height - data[0])
				for (let i = 1; i < data.length; i++) {
					this.ctx.lineTo(i * this.valueIncrement, this.height - data[i])
				}
			}

			if (this.chartType === 'area') {
				this.ctx.lineTo((data.length - 1) * this.valueIncrement, this.height)
				this.ctx.lineTo(0, this.height)
				this.ctx.fill()
			} else {
				this.ctx.stroke()
			}
		} else if (this.chartType === 'bar') {
			const barWidth = this.valueIncrement * 0.6
			for (let i = 0; i < data.length; i++) {
				const h = data[i]
				const x = i * this.valueIncrement
				const y = this.height - h
				this.ctx.fillRect(x, y, barWidth, h)
			}
		} else if (this.chartType === 'scatter') {
			for (let i = 0; i < data.length; i++) {
				const x = i * this.valueIncrement
				const y = this.height - data[i]
				this.ctx.beginPath()
				this.ctx.arc(x, y, 4, 0, Math.PI * 2)
				this.ctx.fill()
			}
		}
	}

	drawExampleGrid() {
		this.ctx.strokeStyle = this.colors.grid
		this.ctx.fillStyle = this.colors.text
		this.ctx.lineWidth = 1
		this.ctx.font = '10px sans-serif'

		// Vertical
		for (let x = 0; x < this.width; x += 100) {
			this.ctx.beginPath()
			this.ctx.moveTo(x, 0)
			this.ctx.lineTo(x, this.height)
			this.ctx.stroke()
			this.ctx.fillText(x, x + 2, this.height - 5)
		}

		// Horizontal
		for (let y = 0; y < this.height; y += 100) {
			this.ctx.beginPath()
			this.ctx.moveTo(0, y)
			this.ctx.lineTo(this.width, y)
			this.ctx.stroke()
			this.ctx.fillText(this.height - y, 5, y - 5)
		}
	}

	handleMouseMove(e) {
		const rect = this.canvas.getBoundingClientRect()
		const x = e.clientX - rect.left
		const index = Math.round(x / this.valueIncrement)

		if (index >= 0 && index < this.dataA.length) {
			const valA = this.dataA[index]
			const valB = this.dataB[index]

			this.tooltip.classList.remove('hidden')
			this.tooltip.style.left = index * this.valueIncrement + rect.left + 'px'
			this.tooltip.style.top = e.clientY - 20 + 'px'
			this.tooltip.innerHTML = `Time: ${index}<br>A: ${valA}<br>B: ${valB}`
		} else {
			this.tooltip.classList.add('hidden')
		}
	}

	updateStats() {
		// Last Values
		const currentA = this.dataA[this.dataA.length - 1]
		const currentB = this.dataB[this.dataB.length - 1]
		document.getElementById('statA').innerText = currentA
		document.getElementById('statB').innerText = currentB

		// Dataset Math (Combine both for general stats)
		const allData = [...this.dataA, ...this.dataB]
		const min = Math.min(...allData)
		const max = Math.max(...allData)
		const avg = Math.round(allData.reduce((a, b) => a + b, 0) / allData.length)

		// Trend (Simple Compare last 2)
		const prevA = this.dataA[this.dataA.length - 2] || 0
		const trend = currentA > prevA ? '↗ Rising' : currentA < prevA ? '↘ Falling' : '→ Stable'

		document.getElementById('statMin').innerText = min
		document.getElementById('statMax').innerText = max
		document.getElementById('statAvg').innerText = avg
		document.getElementById('statTrend').innerText = trend
	}
}

// Init
window.onload = function () {
	new ChartApp()
}
