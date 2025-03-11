(() => {
	async function isIncognito() {
		// navigator.storage doesn't exist or navigator.storage.estimate doesn't exist
		if (!navigator?.storage?.estimate) {
			return false; // storage API not supported, default to false
		}
		const { quota } = await navigator.storage.estimate();
		return quota < 599582045798; // this may change as browsers advance
	}

	isIncognito().then(isPrivate => {
		const icon = String.fromCodePoint(9004);
		const fill = isPrivate ? 'white' : 'black';
		const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
		link.rel = 'shortcut icon';
		link.href = `data:image/svg+xml,<svg viewBox='1.46 -12.8 11.3 13.05' xmlns='http://www.w3.org/2000/svg'><text fill='${fill}'>${icon}</text></svg>`;
		document.getElementsByTagName('head')[0].appendChild(link);
	});
})()