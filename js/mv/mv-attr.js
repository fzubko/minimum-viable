import { Logger } from './logger.js';
import { evaluateAsObject } from './evaluate.js';

export function mvAttr(root, $scope) {
	for (const node of getAttrNodes(root)){
		const statement = node.getAttribute('mv-attr');
		const label = `mv-attr="${statement}"`;
		let result;
		
		Logger.attrCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
		
		// ---------- Change Handler ----------
		// this executes any time a recorded dependency has a change
		const onchange = () => {
			const newResult = getResult();
			
			// short circuit if no change
			if (JSON.stringify(result) === JSON.stringify(newResult)) {
				return;
			}
			result = newResult;

			// update dom
			Object.entries(result).forEach(([key, value]) => {
				if (!!value) {
					node.setAttribute(key, booleanAttributeList.includes(key) ? '': value);
				} else {
					node.removeAttribute(key);
				}
			});
			Logger.attrUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), result);
		}

		// ---------- Evaluate Result ----------
		const getResult = () => {
			try {
				// set the onchange to watch the dependencies
				// creates a callback in changeOnceDOM for each object the evaluation traverses
				$scope.$dependencyChangeFunction = onchange;
				return evaluateAsObject($scope, statement);
			} catch (e)  {
				Logger.attrBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), '\n', e);
			} finally {
				$scope.$dependencyChangeFunction = null;
			}
		}
		
		/*
			mv-attr="{disabled: $scope.user.$loading}"
		*/

		// ---------- Initialize ----------
		onchange();
		
		// ---------- Register Unload Actions ----------
		// remove all references when this scope gets unloaded
		$scope.whenUnload.then(() => {
			Logger.attrRemove && console.debug('%c' + label, Logger.css.remove($scope.$depth));
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

const booleanAttributeList = [
	'allowfullscreen',
	'async',
	'autofocus',
	'autoplay',
	'checked',
	'controls',
	'default',
	'defer',
	'disabled',
	'formnovalidate',
	'inert',
	'ismap',
	'itemscope',
	'loop',
	'multiple',
	'muted',
	'nomodule',
	'novalidate',
	'open',
	'playsinline',
	'readonly',
	'required',
	'reversed',
	'selected',
	'shadowrootclonable',
	'shadowrootdelegatesfocus',
	'shadowrootserializable'
];

function* getAttrNodes(root) {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
		node.hasAttribute('mv-each')
		? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
		: (
			node.hasAttribute('mv-attr')
			? NodeFilter.FILTER_ACCEPT
			: NodeFilter.FILTER_SKIP
		)
	)
	
	while(treeWalker.nextNode()) yield treeWalker.currentNode;
}