import { Logger } from './logger.js';
import { evaluateAsBoolean } from './evaluate.js';

export function mvIf(root, $scope) {
	for (const node of root.querySelectorAll(':scope [mv-if]')){
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
				} else { // hide it
					node.replaceWith(comment);
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
		if (!result) node.replaceWith(comment);
		
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