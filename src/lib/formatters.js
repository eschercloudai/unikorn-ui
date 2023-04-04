export function namedObjectFormatter(o) {
	return o.name;
}

export function applicationBundleFormatter(b) {
	if (b.preview) {
		return `${b.version} (Preview)`;
	} else if (b.endOfLife) {
		return `${b.version} (EOL ${new Date(b.endOfLife).toDateString()})`;
	} else {
		return b.version;
	}
}

export function flavorFormatter(f) {
	if (f.gpus) {
		return `${f.name} (${f.cpus} core, ${f.memory}Gi, ${f.gpus} GPU)`;
	} else {
		return `${f.name} (${f.cpus} core, ${f.memory}Gi)`;
	}
}

export function timeOfDayFormatter(x) {
	if (x < 10) {
		return `0${x}:00 UTC`;
	}

	return `${x}:00 UTC`;
}
