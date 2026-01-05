document.addEventListener('DOMContentLoaded', () => {
	let allAlbums = []
	const grid = document.getElementById('albumGrid')
	const searchInput = document.getElementById('searchInput')
	const sortSelect = document.getElementById('sortSelect')
	const modal = new bootstrap.Modal(document.getElementById('exampleModal'))

	// Fetch Data
	fetch('assets/data/library.json')
		.then((response) => response.json())
		.then((data) => {
			allAlbums = data
			renderAlbums(allAlbums)
		})
		.catch((error) => console.error('Error loading library:', error))

	// Render Function
	function renderAlbums(albums) {
		grid.innerHTML = ''

		albums.forEach((album) => {
			// Create Column
			const col = document.createElement('div')
			// Responsive classes matching prompt: xl-2 (6/row), md-3 (4/row), sm-6 (2/row), 12 (1/row)
			col.className = 'col-xl-2 col-md-3 col-sm-6 col-12 mb-4'

			// Create Card
			col.innerHTML = `
                <div class="card h-100">
                    <img src="assets/img/${album.thumbnail}" class="card-img-top" alt="${album.album} cover">
                    <div class="card-body">
                        <h5 class="card-title text-truncate" title="${album.artist}">${album.artist}</h5>
                        <p class="card-text text-truncate" title="${album.album}">${album.album}</p>
                    </div>
                    <div class="card-footer bg-transparent border-top-0">
                        <button class="btn btn-primary w-100 view-tracklist" data-id="${album.id}">
                            View Tracklist
                        </button>
                    </div>
                </div>
            `

			grid.appendChild(col)
		})

		// Add Event Listeners for new buttons
		document.querySelectorAll('.view-tracklist').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				const albumId = parseInt(e.target.dataset.id)
				openModal(albumId)
			})
		})
	}

	// Modal Logic
	function openModal(id) {
		const album = allAlbums.find((a) => a.id === id)
		if (!album) return

		// Set Title
		document.getElementById('exampleModalLabel').textContent = `${album.artist} - ${album.album}`

		// Calculate Stats
		const totalTracks = album.tracklist.length
		let totalSeconds = 0
		let minTrack = album.tracklist[0]
		let maxTrack = album.tracklist[0]

		album.tracklist.forEach((track) => {
			const [mins, secs] = track.trackLength.split(':').map(Number)
			const duration = mins * 60 + secs
			totalSeconds += duration

			if (duration < timeToSeconds(minTrack.trackLength)) minTrack = track
			if (duration > timeToSeconds(maxTrack.trackLength)) maxTrack = track
		})

		const avgSeconds = totalSeconds / totalTracks

		// Render Stats
		const statsContainer = document.getElementById('modalStats')
		statsContainer.innerHTML = `
            <div class="row text-center">
                <div class="col-6 col-md-3"><strong>Tracks:</strong><br>${totalTracks}</div>
                <div class="col-6 col-md-3"><strong>Total Duration:</strong><br>${formatTime(totalSeconds)}</div>
                <div class="col-6 col-md-3"><strong>Longest:</strong><br>${maxTrack.title} (${
			maxTrack.trackLength
		})</div>
                <div class="col-6 col-md-3"><strong>Shortest:</strong><br>${minTrack.title} (${
			minTrack.trackLength
		})</div>
            </div>
            <div class="text-center mt-2 small text-muted">Avg Track Length: ${formatTime(avgSeconds)}</div>
        `

		// Render Tracklist
		const tbody = document.getElementById('tracklistBody')
		tbody.innerHTML = ''
		album.tracklist.forEach((track) => {
			const row = document.createElement('tr')
			row.innerHTML = `
                <td>${track.number}</td>
                <td><a href="${track.url}" target="_blank" class="spotify-link">${track.title}</a></td>
                <td>${track.trackLength}</td>
            `
			tbody.appendChild(row)
		})

		// Update Footer Button
		const playBtn = document.getElementById('btnPlaySpotify')
		if (album.tracklist.length > 0) {
			playBtn.style.display = 'inline-block'
			playBtn.onclick = () => window.open(album.tracklist[0].url, '_blank')
		} else {
			playBtn.style.display = 'none'
		}

		modal.show()
	}

	// Search Filter
	searchInput.addEventListener('input', (e) => {
		const query = e.target.value.toLowerCase()
		const filtered = allAlbums.filter(
			(album) => album.artist.toLowerCase().includes(query) || album.album.toLowerCase().includes(query)
		)
		renderAlbums(filtered)
	})

	// Sort Logic
	sortSelect.addEventListener('change', (e) => {
		const type = e.target.value
		const sorted = [...allAlbums] // Copy array

		sorted.sort((a, b) => {
			if (type === 'artist-asc') return a.artist.localeCompare(b.artist)
			if (type === 'album-asc') return a.album.localeCompare(b.album)
			if (type === 'tracks-desc') return b.tracklist.length - a.tracklist.length
			if (type === 'tracks-asc') return a.tracklist.length - b.tracklist.length
		})

		renderAlbums(sorted)
	})

	// Helpers
	function timeToSeconds(timeStr) {
		const [m, s] = timeStr.split(':').map(Number)
		return m * 60 + s
	}

	function formatTime(seconds) {
		const m = Math.floor(seconds / 60)
		const s = Math.floor(seconds % 60)
		return `${m}:${s.toString().padStart(2, '0')}`
	}
})
