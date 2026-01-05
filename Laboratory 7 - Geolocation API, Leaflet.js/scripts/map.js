class MapApp {
	constructor() {
		this.map = null
		this.userMarker = null
		this.accuracyCircle = null
		this.measureMode = false
		this.routeMode = false
		this.measurePoints = []
		this.routePoints = []
		this.routeLine = null
		this.measureLine = null

		// DB
		this.places = [
			{ name: 'Central Park', type: 'park', lat: 40.785091, lng: -73.968285, desc: 'Huge green space' },
			{ name: 'Times Square', type: 'landmark', lat: 40.758896, lng: -73.98513, desc: 'Neon lights & tourists' },
			{ name: "Joe's Pizza", type: 'restaurant', lat: 40.73061, lng: -74.00297, desc: 'Best pizza in town' },
			{ name: 'Empire State', type: 'landmark', lat: 40.748817, lng: -73.985428, desc: 'Tall building' }
			// Add some "local" dummies dynamically based on first user position for demo
		]

		this.layerGroups = {
			parks: L.layerGroup(),
			landmarks: L.layerGroup(),
			restaurants: L.layerGroup(),
			misc: L.layerGroup()
		}

		this.init()
	}

	init() {
		this.initMap()
		this.initGeolocation()
		this.bindEvents()
	}

	initMap() {
		// Tile Layers
		const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		})

		const satellite = L.tileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{
				attribution: 'Tiles &copy; Esri'
			}
		)

		const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
			maxZoom: 17,
			attribution: '© OpenTopoMap'
		})

		// Map Init (Default center 0,0 until geo kicks in)
		this.map = L.map('map', {
			center: [0, 0],
			zoom: 2,
			layers: [osm] // Default
		})

		// Layer Control
		const baseMaps = { Standard: osm, Satellite: satellite, Terrain: terrain }
		const overlayMaps = {
			Parks: this.layerGroups.parks,
			Landmarks: this.layerGroups.landmarks,
			Restaurants: this.layerGroups.restaurants
		}

		L.control.layers(baseMaps, overlayMaps).addTo(this.map)

		// Add Groups to map initially
		Object.values(this.layerGroups).forEach((g) => g.addTo(this.map))

		// Click Handler for Tools
		this.map.on('click', (e) => this.handleMapClick(e))
	}

	initGeolocation() {
		if (!navigator.geolocation) {
			this.showAlert('Geolocation is not supported by your browser.')
			return
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => this.handleLocationSuccess(pos),
			(err) => this.handleLocationError(err),
			{ enableHighAccuracy: true }
		)

		// Watch for moving (Geofencing)
		navigator.geolocation.watchPosition((pos) => this.checkGeofence(pos))
	}

	handleLocationSuccess(pos) {
		const { latitude: lat, longitude: lng, accuracy } = pos.coords
		console.log(`User at: ${lat}, ${lng}`)

		// Update View
		this.map.setView([lat, lng], 16)

		// Marker & Circle
		if (this.userMarker) {
			this.userMarker.setLatLng([lat, lng])
			this.accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy)
		} else {
			// Custom Icon for User
			const userIcon = L.divIcon({
				className: 'user-pin',
				html: '<div style="background:blue;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>'
			})

			this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map).bindPopup('You are here!').openPopup()

			this.accuracyCircle = L.circle([lat, lng], {
				color: 'green',
				fillColor: '#3ef03e',
				fillOpacity: 0.3,
				radius: accuracy
			}).addTo(this.map)
		}

		// Demo: Generate some "Nearby" places around user to test features
		if (this.places.length <= 4) {
			// Only do once
			this.addDummyPlaces(lat, lng)
			this.renderPlaces()
		}
	}

	handleLocationError(err) {
		let msg = 'Unknown error'
		switch (err.code) {
			case err.PERMISSION_DENIED:
				msg = 'Location permission denied.'
				break
			case err.POSITION_UNAVAILABLE:
				msg = 'Location unavailable.'
				break
			case err.TIMEOUT:
				msg = 'Location request timed out.'
				break
		}
		this.showAlert(msg)
	}

	addDummyPlaces(lat, lng) {
		// Add fake points around user
		this.places.push({
			name: 'Nearby Park',
			type: 'park',
			lat: lat + 0.002,
			lng: lng + 0.002,
			desc: 'A lovely green space'
		})
		this.places.push({
			name: 'Local Cafe',
			type: 'restaurant',
			lat: lat - 0.001,
			lng: lng + 0.001,
			desc: 'Great coffee'
		})
		this.places.push({
			name: 'Historical Statue',
			type: 'landmark',
			lat: lat + 0.001,
			lng: lng - 0.002,
			desc: 'Old thing'
		})

		// Add Geofence Zone
		const fenceLat = lat + 0.003
		const fenceLng = lng
		this.dangerZone = L.circle([fenceLat, fenceLng], {
			color: 'red',
			fillColor: '#f03',
			fillOpacity: 0.2,
			radius: 100
		})
			.addTo(this.map)
			.bindPopup('Restricted Area (Geofence)')
		this.dangerZonePos = { lat: fenceLat, lng: fenceLng, r: 100 }
	}

	renderPlaces() {
		const icons = {
			park: L.divIcon({ html: '🌳', className: 'emoji-icon' }),
			restaurant: L.divIcon({ html: '🍕', className: 'emoji-icon' }),
			landmark: L.divIcon({ html: 'jz', className: 'emoji-icon' }) // placeholder
		}

		this.places.forEach((p) => {
			const marker = L.marker([p.lat, p.lng], {
				title: p.name
			}).bindPopup(`<b>${p.name}</b><br>${p.desc}<br><small>${p.type}</small>`)

			if (this.layerGroups[p.type]) {
				this.layerGroups[p.type].addLayer(marker)
			} else {
				this.layerGroups.misc.addLayer(marker)
			}
		})
	}

	handleMapClick(e) {
		if (this.measureMode) {
			this.measurePoints.push(e.latlng)
			if (this.measurePoints.length === 2) {
				const dist = this.map.distance(this.measurePoints[0], this.measurePoints[1])
				const mk1 = L.marker(this.measurePoints[0]).addTo(this.map)
				const mk2 = L.marker(this.measurePoints[1]).addTo(this.map)
				this.measureLine = L.polyline(this.measurePoints, { color: 'red' }).addTo(this.map)

				this.showInfo(`Distance: ${(dist / 1000).toFixed(2)} km  / ${(dist * 0.000621371).toFixed(2)} mi`)

				// Reset after delay or manual? Let's just keep adding for now or simple 2-point
				this.measurePoints = [] // Reset for next pair
				setTimeout(() => {
					this.map.removeLayer(mk1)
					this.map.removeLayer(mk2)
					this.map.removeLayer(this.measureLine)
				}, 4000)
			}
		} else if (this.routeMode) {
			this.routePoints.push(e.latlng)
			L.circleMarker(e.latlng, { radius: 4, color: 'blue' }).addTo(this.map)

			if (this.routePoints.length > 1) {
				if (this.routeLine) this.map.removeLayer(this.routeLine)
				this.routeLine = L.polyline(this.routePoints, { color: 'blue' }).addTo(this.map)

				// Calc total dist
				let total = 0
				for (let i = 0; i < this.routePoints.length - 1; i++) {
					total += this.map.distance(this.routePoints[i], this.routePoints[i + 1])
				}
				this.showInfo(`Route Distance: ${(total / 1000).toFixed(2)} km`)
			}
		}
	}

	toggleTool(tool) {
		this.measureMode = tool === 'measure'
		this.routeMode = tool === 'route'

		document.getElementById('btnMeasure').classList.toggle('active', this.measureMode)
		document.getElementById('btnRoute').classList.toggle('active', this.routeMode)

		if (!this.measureMode && !this.routeMode) {
			this.showInfo('')
		} else {
			this.showInfo(this.measureMode ? 'Click 2 points to measure' : 'Click points to draw route')
		}
	}

	bindEvents() {
		document.getElementById('btnMeasure').onclick = () => this.toggleTool('measure')
		document.getElementById('btnRoute').onclick = () => this.toggleTool('route')

		document.getElementById('btnClear').onclick = () => {
			// Clear map logic would go here (remove temp layers)
			this.routePoints = []
			if (this.routeLine) this.map.removeLayer(this.routeLine)
			this.toggleTool(null)
			this.showInfo('Tools cleared')
		}

		// Search
		document.getElementById('btnSearch').onclick = () => {
			const query = document.getElementById('searchInput').value.toLowerCase()
			const target = this.places.find((p) => p.name.toLowerCase().includes(query))
			if (target) {
				this.map.flyTo([target.lat, target.lng], 18)
				this.showInfo(`Found: ${target.name}`)
			} else {
				this.showAlert('Place not found in database')
			}
		}
	}

	checkGeofence(pos) {
		if (!this.dangerZonePos) return
		const d = this.map.distance(
			[pos.coords.latitude, pos.coords.longitude],
			[this.dangerZonePos.lat, this.dangerZonePos.lng]
		)

		if (d < this.dangerZonePos.r) {
			this.showAlert('⚠️ WARNING: You have entered a Restricted Zone!')
		}
	}

	showAlert(msg) {
		const box = document.getElementById('alertBox')
		document.getElementById('alertMessage').innerText = msg
		box.classList.remove('hidden')
		setTimeout(() => box.classList.add('hidden'), 5000) // Auto hide
	}

	showInfo(msg) {
		const box = document.getElementById('infoDisplay')
		if (!msg) {
			box.classList.add('hidden')
			return
		}
		document.getElementById('infoText').innerText = msg
		box.classList.remove('hidden')
	}
}

window.onload = function () {
	new MapApp()
}
