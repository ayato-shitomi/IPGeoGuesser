const Game = (function() {
	const CONFIG = {
		totalRounds: 5,
		maxScorePerRound: 5000,
		maxAttempts: 10
	};

	let state = {
		currentRound: 1,
		totalScore: 0,
		currentIP: null,
		currentLocation: null
	};

	let markers = {
		guess: null,
		actual: null,
		line: null
	};

	let map = null;
	let icons = {};
	let elements = {};

	function init() {
		cacheElements();
		initMap();
		bindEvents();
		startRound();
	}

	function cacheElements() {
		elements = {
			ipDisplay: document.getElementById('ipDisplay'),
			currentRound: document.getElementById('currentRound'),
			totalRounds: document.getElementById('totalRounds'),
			totalScore: document.getElementById('totalScore'),
			guessBtn: document.getElementById('guessBtn'),
			nextBtn: document.getElementById('nextBtn'),
			overlay: document.getElementById('overlay'),
			resultPopup: document.getElementById('resultPopup'),
			resultDistance: document.getElementById('resultDistance'),
			resultPoints: document.getElementById('resultPoints'),
			resultLocation: document.getElementById('resultLocation'),
			finalScreen: document.getElementById('finalScreen'),
			finalScore: document.getElementById('finalScore'),
			playAgainBtn: document.getElementById('playAgainBtn'),
			shareXBtn: document.getElementById('shareX'),
			copyResultBtn: document.getElementById('copyResult')
		};

		elements.totalRounds.textContent = CONFIG.totalRounds;
	}

	function initMap() {
		map = L.map('map').setView([30, 0], 2);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		icons.guess = L.divIcon({
			className: 'marker-guess',
			html: '<div style="width:20px;height:20px;background:#e94560;border:3px solid #fff;border-radius:50%;"></div>',
			iconSize: [20, 20],
			iconAnchor: [10, 10]
		});

		icons.actual = L.divIcon({
			className: 'marker-actual',
			html: '<div style="width:20px;height:20px;background:#00ff00;border:3px solid #fff;border-radius:50%;"></div>',
			iconSize: [20, 20],
			iconAnchor: [10, 10]
		});
	}

	function bindEvents() {
		map.on('click', handleMapClick);
		elements.guessBtn.addEventListener('click', handleGuess);
		elements.nextBtn.addEventListener('click', handleNextRound);
		elements.playAgainBtn.addEventListener('click', handlePlayAgain);
		elements.shareXBtn.addEventListener('click', handleShareX);
		elements.copyResultBtn.addEventListener('click', handleCopyResult);
	}

	function handleMapClick(e) {
		if (!state.currentLocation) return;

		if (markers.guess) {
			map.removeLayer(markers.guess);
		}

		markers.guess = L.marker(e.latlng, { icon: icons.guess }).addTo(map);
		elements.guessBtn.disabled = false;
		elements.guessBtn.textContent = 'Confirm Guess';
	}

	function handleGuess() {
		if (!markers.guess || !state.currentLocation) return;

		const guessLatLng = markers.guess.getLatLng();
		const distance = haversineDistance(
			guessLatLng.lat,
			guessLatLng.lng,
			state.currentLocation.lat,
			state.currentLocation.lon
		);
		const points = calculateScore(distance);

		showResult(guessLatLng, distance, points);
	}

	function showResult(guessLatLng, distance, points) {
		const actualLatLng = [state.currentLocation.lat, state.currentLocation.lon];

		markers.actual = L.marker(actualLatLng, { icon: icons.actual }).addTo(map);

		markers.line = L.polyline(
			[[guessLatLng.lat, guessLatLng.lng], actualLatLng],
			{ color: '#e94560', dashArray: '10, 10' }
		).addTo(map);

		const bounds = L.latLngBounds([
			[guessLatLng.lat, guessLatLng.lng],
			actualLatLng
		]);
		map.fitBounds(bounds, { padding: [50, 50] });

		state.totalScore += points;
		elements.totalScore.textContent = state.totalScore;

		elements.resultDistance.textContent = `Distance: ${Math.round(distance).toLocaleString()} km`;
		elements.resultPoints.textContent = points;
		elements.resultLocation.textContent = `Actual: ${state.currentLocation.country}`;

		elements.overlay.style.display = 'block';
		elements.resultPopup.style.display = 'block';
		elements.guessBtn.style.display = 'none';
	}

	function handleNextRound() {
		elements.overlay.style.display = 'none';
		elements.resultPopup.style.display = 'none';

		if (state.currentRound >= CONFIG.totalRounds) {
			showFinalScreen();
		} else {
			state.currentRound++;
			elements.currentRound.textContent = state.currentRound;
			startRound();
		}
	}

	function handlePlayAgain() {
		elements.finalScreen.style.display = 'none';
		elements.overlay.style.display = 'none';

		state.currentRound = 1;
		state.totalScore = 0;

		elements.currentRound.textContent = state.currentRound;
		elements.totalScore.textContent = state.totalScore;

		startRound();
	}

	function showFinalScreen() {
		elements.finalScore.textContent = state.totalScore.toLocaleString();
		elements.overlay.style.display = 'block';
		elements.finalScreen.style.display = 'block';
	}

	function getShareText() {
		const maxScore = CONFIG.totalRounds * CONFIG.maxScorePerRound;
		const percent = Math.round((state.totalScore / maxScore) * 100);
		return `IP GeoGuesser\nScore: ${state.totalScore.toLocaleString()} / ${maxScore.toLocaleString()} (${percent}%)\n\nCan you guess the location from an IP address?`;
	}

	function handleShareX() {
		const text = encodeURIComponent(getShareText());
		const url = encodeURIComponent(window.location.href);
		window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
	}

	function handleCopyResult() {
		const text = getShareText() + '\n' + window.location.href;

		navigator.clipboard.writeText(text).then(() => {
			const btn = elements.copyResultBtn;
			btn.classList.add('btn--copied');
			btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;

			setTimeout(() => {
				btn.classList.remove('btn--copied');
				btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
			}, 2000);
		});
	}

	async function startRound() {
		clearMarkers();
		resetUI();

		map.setView([30, 0], 2);

		elements.ipDisplay.innerHTML = '<span class="game__ip-address--loading">Loading...</span>';
		state.currentLocation = null;

		let attempts = 0;
		while (!state.currentLocation && attempts < CONFIG.maxAttempts) {
			state.currentIP = randomIPv4();
			state.currentLocation = await ip2Location(state.currentIP);
			attempts++;
		}

		if (state.currentLocation) {
			elements.ipDisplay.textContent = state.currentIP;
		} else {
			elements.ipDisplay.textContent = 'Error loading IP...';
			setTimeout(() => startRound(), 1000);
		}
	}

	function clearMarkers() {
		if (markers.guess) {
			map.removeLayer(markers.guess);
			markers.guess = null;
		}
		if (markers.actual) {
			map.removeLayer(markers.actual);
			markers.actual = null;
		}
		if (markers.line) {
			map.removeLayer(markers.line);
			markers.line = null;
		}
	}

	function resetUI() {
		elements.guessBtn.disabled = true;
		elements.guessBtn.textContent = 'Select a location first';
		elements.guessBtn.style.display = 'inline-block';
	}

	return { init };
})();

document.addEventListener('DOMContentLoaded', Game.init);
