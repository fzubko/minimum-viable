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
		for (let node of root.querySelectorAll(`:scope [${attribute}]`)){
			Logger.eventCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
			const listener = (event) => {
				try {
					Logger.eventInvoke && console.debug('%c' + label, Logger.css.invoke($scope.$depth));
					event.preventDefault();
					evaluate.call(node, $scope, node.getAttribute(attribute));
				} catch (e) {
					console.warn('%c'+attribute, 'color: darkorange;', '\n', e);
				}
			}
			node.addEventListener(eventName, listener);
			$scope.whenUnload.then(() => removeEventListener(eventName, listener))
		}
	}
}