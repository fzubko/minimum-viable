import { Logger } from './logger.js';
import { evaluateAsBoolean } from './evaluate.js';

export function mvIf(root, $scope) {
	const endOfStackPromise = Promise.resolve();
	
	for (const node of getIfNodes(root)){
		const statement = node.getAttribute('mv-if');
		const label = `mv-if="${statement}"`;
		const comment = document.createComment(label); // used to swap in/out
		
		Logger.ifCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
		
		// ---------- Change Handler ----------
		// this executes any time a recorded dependency has a change
		const onchange = () => {
			Logger.ifUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), result);
			const newResult = getResult();
			// update dom if different
			// legit changes may not be different like "$scope.arr.length > 0"
			if (result != newResult) {
				result = newResult;
				if (result) { // show it
					comment.replaceWith(node);
					node.$domAnchor = node;
				} else { // hide it
					node.replaceWith(comment);
					node.$domAnchor = comment;
				}
			}
			Logger.ifUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), result);
		}
		
		// ---------- Evaluate Result ----------
		const getResult = () => {
			try {
				// set the onchange to watch the dependencies
				// creates a callback in changeOnceDOM for each object the evaluation traverses
				$scope.$dependencyChangeFunction = onchange;
				return evaluateAsBoolean($scope, statement);
			} catch (e)  {
				Logger.ifBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), '\n', e);
			} finally {
				$scope.$dependencyChangeFunction = null;
			}
		}
		
		// ---------- Initialize ----------
		let result = getResult();
		if (!result) {
			endOfStackPromise.then(() => { // treewalker stops when you pull currentNode, have to wait
				node.replaceWith(comment);
				node.$domAnchor = comment; // used by mv-each for as a point of entry inserts
			});
		}
		
		// ---------- Register Unload Actions ----------
		// remove all references when this scope gets unloaded
		$scope.whenUnload.then(() => {
			Logger.ifRemove && console.debug('%c' + label, Logger.css.remove($scope.$depth));
			const parentCleaner = (obj) => {
				if (obj.$parent) {
					parentCleaner(obj.$parent)
				}
				obj.$callbackMap.changeOnceDOM.forEach(set => set.delete(onchange));
			}
			parentCleaner($scope);
		});
	}
}

function* getIfNodes(root) {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
		node.hasAttribute('mv-each')
		? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
		: (
			node.hasAttribute('mv-if')
			? NodeFilter.FILTER_ACCEPT
			: NodeFilter.FILTER_SKIP
		)
	)
	
	if (root.hasAttribute('mv-if')) yield treeWalker.currentNode;
	
	while(treeWalker.nextNode()) yield treeWalker.currentNode;
}