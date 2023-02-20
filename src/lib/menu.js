import { browser } from '$app/environment';

// menu is the main menu definition.
const menu = {
	id: 'root',
	children: [
		{
			id: 'dashboard',
			value: 'Dashboard',
			icon: 'ri:dashboard-3-line'
		},
		{
			id: 'kubernetes',
			value: 'Kubernetes',
			icon: 'mdi:kubernetes',
			children: [
				{
					id: 'kubernetes-control-planes',
					value: 'Control Planes'
				},
				{
					id: 'kubernetes-clusters',
					value: 'Clusters'
				}
			]
		}
	]
};

// writable implements session storage to remember the id we are
// at in the menu.
export function writable(key, defaultValue) {
	// Read the initial value;
	let value = null;

	if (browser) {
		value = window.sessionStorage.getItem(key);

		if (value == null) {
			window.sessionStorage.setItem(key, defaultValue);
			value = defaultValue;
		}
	}

	// Keep a set of subscribers.
	const subscribers = new Set();

	// set sets the value and notifies all subscribers.
	function set(new_value) {
		value = new_value;

		if (browser) {
			window.sessionStorage.setItem(key, value);
		}

		for (const subscriber of subscribers) {
			subscriber(value);
		}
	}

	// subscribe registers the new callback and notifies
	// it of the current value.
	function subscribe(run) {
		subscribers.add(run);
		run(value);
	}

	return { set, subscribe };
}

// selected allows components to subscribe to menu selection updates.
export const selected = writable('navigation', 'dashboard');

// returns the breadcrumb trail based on the given ID, this should
// be called from a scubscribe.
export function getBreadcrumbs(id, root = menu) {
	// Leaf node, either return the matching value, or null if no match.
	if (!root.children) {
		if (root.id == id) {
			return [root];
		}

		return null;
	}

	// Parent node, if a child matches preprend the current value.
	if (root.children) {
		for (const child of root.children) {
			let trail = getBreadcrumbs(id, child);

			if (trail != null) {
				trail.unshift(root);
				return trail;
			}
		}
	}

	return null;
}

// expand does a depth first traversal of the menu and expands submenus
// back from the selcted element ID.
function expand(id, root) {
	if (!root.children) {
		if (root.id == id) {
			return true;
		}

		return false;
	}

	if (root.children) {
		for (const child of root.children) {
			const expanded = expand(id, child);

			if (expanded) {
				root.expanded = true;
				return true;
			}
		}
	}

	return false;
}

// getMenu returns a fresh copy of the menu with parents expanded down
// to the selected item ID.
export function getMenu(id) {
	// Apply expansion to a deep copy of the menu.
	let root = JSON.parse(JSON.stringify(menu));

	expand(id, root);

	return root;
}
