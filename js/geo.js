/**
 * Country data cache
 */
let countriesData = null;

/**
 * Load countries data from JSON
 */
async function loadCountries() {
	if (countriesData) return countriesData;

	const res = await fetch('data/countries.json');
	countriesData = await res.json();
	return countriesData;
}

/**
 * Generate a random public IPv4 address
 */
function randomIPv4() {
	while (true) {
		const a = Math.floor(Math.random() * 223) + 1;
		const b = Math.floor(Math.random() * 256);
		const c = Math.floor(Math.random() * 256);
		const d = Math.floor(Math.random() * 254) + 1;

		// Exclude reserved/private ranges
		if (
			a === 10 ||
			a === 127 ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168)
		) continue;

		return `${a}.${b}.${c}.${d}`;
	}
}

/**
 * Get country code for an IP address using country.is API
 */
async function ip2Country(ip) {
	const url = `https://api.country.is/${encodeURIComponent(ip)}`;

	try {
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) return null;

		const data = await res.json();
		return data.country ?? null;
	} catch {
		return null;
	}
}

/**
 * Get full location data for an IP address
 */
async function ip2Location(ip) {
	const code = await ip2Country(ip);
	if (!code) return null;

	const countries = await loadCountries();
	const country = countries[code];
	if (!country) return null;

	return {
		code: code,
		country: country.name,
		lat: country.lat,
		lon: country.lon
	};
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth's radius in km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;

	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) *
		Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculate score based on distance (GeoGuessr-style scoring)
 */
function calculateScore(distanceKm) {
	const maxScore = 5000;

	if (distanceKm < 50) return maxScore;

	return Math.max(0, Math.round(maxScore * Math.exp(-distanceKm / 2000)));
}
