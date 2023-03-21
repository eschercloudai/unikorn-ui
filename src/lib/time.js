export function age(start) {
	// This is in milliseconds.
	let duration = Date.now() - Date.parse(start);

	// Handle clock skew.
	if (duration < 0) {
		return '0s';
	}

	// Now in seconds.
	duration = Math.floor(duration / 1000);

	if (duration == 0) {
		return '0s';
	}

	const seconds = duration % 60;
	duration = Math.floor(duration / 60);

	if (duration == 0) {
		return `${seconds}s`;
	}

	const minutes = duration % 60;
	duration = Math.floor(duration / 60);

	if (duration == 0) {
		return `${minutes}m ${seconds}s`;
	}

	const hours = duration % 24;
	duration = Math.floor(duration / 24);

	if (duration == 0) {
		return `${hours}h ${minutes}m`;
	}

	// Stop here, months and years are variable length.
	return `${duration}d ${hours}h`;
}
