import { localStorage } from '$lib/localStorage';

// menu is the main menu definition.
const menu = {
	id: 'root',
	children: [
		{
			id: 'kubernetes',
			value: 'Kubernetes Service',
			icon: 'mdi:kubernetes',
			children: [
				{
					id: 'kubernetes-applications',
					value: 'Applications'
				},
				{
					id: 'kubernetes-clusters',
					value: 'Clusters'
				},
				{
					id: 'kubernetes-control-planes',
					value: 'Control Planes'
				}
			]
		},
		{
			id: 'documentation',
			value: 'Documentation',
			icon: 'mdi:book-open-blank-variant',
			link: 'https://docs.eschercloud.ai'
		}
	]
};

// defaultID selects the default/first-time view.
const defaultID = 'kubernetes-clusters';

// selected allows components to subscribe to menu selection updates.
export const selected = localStorage('navigation', defaultID);

// hasID is used to spot when clients have an old ID selected, but it no
// longer exists.
function hasID(id, root = menu) {
	if (!root.children) {
		return root.id == id;
	}

	for (const child of root.children) {
		if (hasID(id, child)) {
			return true;
		}
	}

	return false;
}

function fixID(id) {
	if (!hasID(id)) {
		selected.set(defaultID);

		return defaultID;
	}

	return id;
}

// returns the breadcrumb trail based on the given ID, this should
// be called from a scubscribe.
export function getBreadcrumbs(id, root = menu) {
	id = fixID(id);

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
	id = fixID(id);

	// Apply expansion to a deep copy of the menu.
	let root = JSON.parse(JSON.stringify(menu));

	expand(id, root);

	return root;
}
