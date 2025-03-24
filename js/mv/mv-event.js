import { Logger } from './logger.js';
import { evaluate } from './evaluate.js';

export function mvEvent(root, $scope) {
	// add these as needed...
	// https://developer.mozilla.org/en-US/docs/Web/API/Element#events
	let eventMap = new Map([
		//['mv-load', 'load'],
		['mv-click', 'click'],
		['mv-submit', 'submit']
	]);
	for (const [attribute, eventName] of eventMap) {
		const label = $scope.$label + `[${attribute}]`;
		for (const node of getNodes(root, attribute)){
			Logger.eventCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
			const listener = (event) => {
				try {
					Logger.eventInvoke && console.debug('%c' + label, Logger.css.invoke($scope.$depth));
					event.preventDefault();
					evaluate.call(node, $scope, event, node.getAttribute(attribute));
				} catch (e) {
					console.warn('%c'+attribute, 'color: darkorange;', '\n', e);
				}
			}
			node.addEventListener(eventName, listener);
			$scope.whenUnload.then(() => removeEventListener(eventName, listener))
		}
	}
}

function* getNodes(root, attribute) {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
		node.hasAttribute('mv-each')
		? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
		: (
			node.hasAttribute(attribute)
			? NodeFilter.FILTER_ACCEPT
			: NodeFilter.FILTER_SKIP
		)
	)
	
	while(treeWalker.nextNode()) yield treeWalker.currentNode;
}