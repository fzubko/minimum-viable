export function mvHref(root) {
	for (const node of getNodes(root)){
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

function* getNodes(root) {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
		node.hasAttribute('mv-each')
		? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
		: (
			node.hasAttribute('mv-href')
			? NodeFilter.FILTER_ACCEPT
			: NodeFilter.FILTER_SKIP
		)
	)
	
	while(treeWalker.nextNode()) yield treeWalker.currentNode;
}