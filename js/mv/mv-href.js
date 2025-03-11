export function mvHref(root) {
	for (const node of root.querySelectorAll(':scope [mv-href]')){
		node.addEventListener('click', (event) => {
			event.stopPropagation();
			event.preventDefault();
			history.pushState('', '', node.getAttribute('href'));
			
			// scroll to hash if we're already there
			if (document.location.hash && document.querySelector(document.location.hash)) {
				document.querySelector(document.location.hash).scrollIntoView();
			}
			
			// kicks off a page load
			dispatchEvent(new Event('popstate'));
		});
	}
}