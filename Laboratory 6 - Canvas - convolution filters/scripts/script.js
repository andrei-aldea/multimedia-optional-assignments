class ImageProcessor {
	constructor() {
		this.originalCanvas = document.getElementById('originalCanvas')
		this.targetCanvas = document.getElementById('outputCanvas')
		this.ctxOriginal = this.originalCanvas.getContext('2d')
		this.ctxTarget = this.targetCanvas.getContext('2d')

		// State
		this.img = new Image()
		this.maxWidth = 800
		this.kernels = {
			edge: [
				[-1, -1, -1],
				[-1, 8, -1],
				[-1, -1, -1]
			],
			gaussian: [
				[1 / 16, 2 / 16, 1 / 16],
				[2 / 16, 4 / 16, 2 / 16],
				[1 / 16, 2 / 16, 1 / 16]
			],
			sharpen: [
				[0, -1, 0],
				[-1, 5, -1],
				[0, -1, 0]
			],
			emboss: [
				[-2, -1, 0],
				[-1, 1, 1],
				[0, 1, 2]
			],
			box: [
				[1 / 9, 1 / 9, 1 / 9],
				[1 / 9, 1 / 9, 1 / 9],
				[1 / 9, 1 / 9, 1 / 9]
			],
			custom: [
				[0, 0, 0],
				[0, 1, 0],
				[0, 0, 0]
			] // Will be overwritten
		}

		this.init()
	}

	init() {
		// Load Default Image
		this.loadImage('../assets/download.png')

		this.bindEvents()
	}

	bindEvents() {
		// File Upload
		document.getElementById('fileInput').addEventListener('change', (e) => {
			const file = e.target.files[0]
			if (file) {
				const reader = new FileReader()
				reader.onload = (event) => this.loadImage(event.target.result)
				reader.readAsDataURL(file)
			}
		})

		// Filter / Controls Change
		const controls = ['filterSelect', 'rngIntensity']
		controls.forEach((id) => {
			document.getElementById(id).addEventListener('input', () => this.process())
		})

		// Toggle Kernel Editor
		document.getElementById('filterSelect').addEventListener('change', (e) => {
			const editor = document.getElementById('kernelEditor')
			editor.style.display = e.target.value === 'custom' ? 'block' : 'none'
		})

		// Apply Custom Kernel
		document.getElementById('applyKernel').addEventListener('click', () => {
			this.readCustomKernel()
			this.process()
		})

		// Export
		document.getElementById('btnExport').addEventListener('click', () => {
			const link = document.createElement('a')
			link.download = 'processed_image.png'
			link.href = this.targetCanvas.toDataURL()
			link.click()
		})

		// Comparison Slider Logic
		const wrapper = document.getElementById('canvasWrapper')
		const compContainer = document.getElementById('comparisonContainer')
		const origContainer = document.getElementById('originalContainer')

		wrapper.addEventListener('mousemove', (e) => {
			if (e.buttons === 1) {
				// Only if dragging (or just moving if preferred, usually drag is better UX but simple hover works for split view)
				// Actually, simple hover or drag. Let's do simple hover tracking for smooth UX as requested
			}
			const rect = wrapper.getBoundingClientRect()
			let x = e.clientX - rect.left
			x = Math.max(0, Math.min(x, rect.width))
			compContainer.style.width = x + 'px'
		})
	}

	loadImage(src) {
		this.img.src = src
		this.img.onload = () => {
			// Resize logic to fit screen
			let w = this.img.width
			let h = this.img.height
			if (w > this.maxWidth) {
				h = (h * this.maxWidth) / w
				w = this.maxWidth
			}

			this.originalCanvas.width = this.targetCanvas.width = w
			this.originalCanvas.height = this.targetCanvas.height = h

			// Important for split view alignment
			document.getElementById('originalContainer').style.width = w + 'px'

			this.ctxOriginal.drawImage(this.img, 0, 0, w, h)
			this.process()
		}
	}

	process() {
		const w = this.targetCanvas.width
		const h = this.targetCanvas.height

		// Get Source Data
		const srcData = this.ctxOriginal.getImageData(0, 0, w, h)
		const output = this.ctxTarget.createImageData(w, h)

		const filterType = document.getElementById('filterSelect').value
		const intensity = parseInt(document.getElementById('rngIntensity').value) / 100
		document.getElementById('valIntensity').textContent = Math.round(intensity * 100) + '%'

		// Apply Logic
		if (this.kernels[filterType]) {
			this.applyConvolution(srcData, output, this.kernels[filterType])
		} else {
			this.applyEffect(srcData, output, filterType)
		}

		// Apply Intensity Blending (Mix Original with Processed)
		if (intensity < 1) {
			this.mixPixels(srcData, output, intensity)
		}

		this.ctxTarget.putImageData(output, 0, 0)
		this.updateHistogram(output)
	}

	applyConvolution(src, dst, kernel) {
		const w = src.width
		const h = src.height
		const pixels = src.data
		const output = dst.data

		// Iterate pixels (skip borders)
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				let r = 0,
					g = 0,
					b = 0

				// Convolve 3x3
				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						const idx = ((y + ky) * w + (x + kx)) * 4
						const weight = kernel[ky + 1][kx + 1]
						r += pixels[idx] * weight
						g += pixels[idx + 1] * weight
						b += pixels[idx + 2] * weight
					}
				}

				const idx = (y * w + x) * 4
				output[idx] = r
				output[idx + 1] = g
				output[idx + 2] = b
				output[idx + 3] = 255
			}
		}
	}

	applyEffect(src, dst, type) {
		const d = src.data
		const out = dst.data
		for (let i = 0; i < d.length; i += 4) {
			let r = d[i],
				g = d[i + 1],
				b = d[i + 2]

			if (type === 'grayscale') {
				let avg = 0.299 * r + 0.587 * g + 0.114 * b
				r = g = b = avg
			} else if (type === 'sepia') {
				let tr = 0.393 * r + 0.769 * g + 0.189 * b
				let tg = 0.349 * r + 0.686 * g + 0.168 * b
				let tb = 0.272 * r + 0.534 * g + 0.131 * b
				r = tr
				g = tg
				b = tb
			} else if (type === 'negative') {
				r = 255 - r
				g = 255 - g
				b = 255 - b
			} else if (type === 'threshold') {
				let avg = (r + g + b) / 3
				let v = avg > 128 ? 255 : 0
				r = g = b = v
			} else if (type === 'brightness') {
				r += 40
				g += 40
				b += 40
			}

			// Copy to output
			out[i] = r
			out[i + 1] = g
			out[i + 2] = b
			out[i + 3] = d[i + 3] // Alpha
		}

		if (type === 'none') {
			out.set(d)
		}
	}

	mixPixels(src, dst, ratio) {
		for (let i = 0; i < src.data.length; i++) {
			dst.data[i] = src.data[i] * (1 - ratio) + dst.data[i] * ratio
		}
	}

	readCustomKernel() {
		const inputs = document.querySelectorAll('.k-input')
		let k = [
			[0, 0, 0],
			[0, 0, 0],
			[0, 0, 0]
		]
		let idx = 0
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				k[i][j] = parseFloat(inputs[idx++].value) || 0
			}
		}
		this.kernels.custom = k
	}

	updateHistogram(imgData) {
		const ctx = document.getElementById('histogramCanvas').getContext('2d')
		const w = ctx.canvas.width
		const h = ctx.canvas.height
		ctx.clearRect(0, 0, w, h)

		// Calculate Frequencies (using Grayscale for simplicity)
		const hist = new Array(256).fill(0)
		const data = imgData.data
		let maxCount = 0

		for (let i = 0; i < data.length; i += 4) {
			const brightness = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3)
			hist[brightness]++
			if (hist[brightness] > maxCount) maxCount = hist[brightness]
		}

		// Draw
		ctx.fillStyle = '#00bcd4'
		ctx.beginPath()
		for (let i = 0; i < 256; i++) {
			const height = (hist[i] / maxCount) * h
			ctx.rect(i, h - height, 1, height)
		}
		ctx.fill()
	}
}

window.onload = function () {
	new ImageProcessor()
}
