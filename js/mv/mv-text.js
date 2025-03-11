import { evaluateTemplateLiteral } from './evaluate.js';
import { Logger } from './logger.js';

export function mvText(root, $scope) {
	const textNodes = getTextNodes(root);
	const nodeAttributesMap = getNodeAttributesMap(root);
	

	// ---------- Text Nodes ----------
	textNodes.forEach((node) => {
		const originalText = node.nodeValue;
		const mvTextString = originalText.replace(/{{/g,'${').replace(/}}/g,'}');
		
		// ---------- Change Handler ----------
		// this executes any time a recorded dependency has a change
		const onchange = () => {
			Logger.textUpdate && console.debug('%c' + originalText.trim(), Logger.css.update($scope.$depth), node.nodeValue);
			const result = getResult();
			// update dom if different
			// legit changes may not be different like {{$scope.arr.length == 0 ? 'No data found' : ''}}
			if (node.nodeValue != result) {
				node.nodeValue = result;
			}
			Logger.textUpdate && console.debug('%c' + originalText.trim(), Logger.css.update($scope.$depth), result);
		}
		
		// ---------- Evaluate Result ----------
		const getResult = () => {
			try {
				// set the onchange to watch the dependencies
				// creates a callback in changeOnceDOM for each object the evaluation traverses
				$scope.$dependencyChangeFunction = onchange;
				return evaluateTemplateLiteral($scope, mvTextString);
			} catch (e)  {
				Logger.textBroken && console.error('%c' + originalText.trim(), Logger.css.broken($scope.$depth), '\n', e);
				return node.nodeValue;
			} finally {
				$scope.$dependencyChangeFunction = null;
			}
		}
		
		Logger.textCreate && console.debug('%c' + originalText.trim(), Logger.css.create($scope.$depth));
		node.nodeValue = getResult(); // set value to result
		
		// ---------- Register Unload Actions ----------
		// remove all references when this scope gets unloaded
		$scope.whenUnload.then(() => {
			Logger.textRemove && console.debug('%c' + originalText.trim(), Logger.css.remove($scope.$depth));
			const parentCleaner = (obj) => {
				if (obj.$parent) {
					parentCleaner(obj.$parent)
				}
				obj.$callbackMap.changeOnceDOM.forEach(set => set.delete(onchange));
			}
			parentCleaner($scope);
		});
		
		// when the result is evaulated, the scope properties will be accessed
		// while proxy serves those properties, it should recognize that a change may mean a different result
		// we need to register an onchange event for each dependency to reevaluate this string
		// they may depend on attributes in this scope or others
		// this check should only occur once and then rebuild itself
		// doing that will accommodate short circuit expressions that exclude dependencies
		// something like... {{$scope.x == 0 ? $scope.nothingLabel : $scope.somethingLabel}}
		//   here if x == 0 we'd have a dependency on x and nothingLabel
		//   if x > 0 then we'd have a dependency on x and somethingLabel
	});
	

	// ---------- Attributes ----------
	nodeAttributesMap.forEach((attributes, node) => {
		attributes.forEach((attribute) => {
			const originalText = attribute.value;
			const mvTextString = originalText.replace(/{{/g,'${').replace(/}}/g,'}');
			
			// ---------- Change Handler ----------
			// this executes any time a recorded dependency has a change
			const onchange = () => {
				Logger.textUpdate && console.debug('%c' + originalText.trim(), Logger.css.update($scope.$depth), attribute.value);
				const result = getResult();
				// update dom if different
				// legit changes may not be different like {{$scope.arr.length == 0 ? 'No data found' : ''}}
				if (attribute.value != result) {
					attribute.value = result;
				}
				Logger.textUpdate && console.debug('%c' + originalText.trim(), Logger.css.update($scope.$depth), result);
			};
			
			// ---------- Evaluate Result ----------
			const getResult = () => {
				try {
					// set the onchange to watch the dependencies
					$scope.$dependencyChangeFunction = onchange;
					return evaluateTemplateLiteral.call(node, $scope, mvTextString);
				} catch (e)  {
					console.warn('%c'+originalText, 'color: darkorange;', '\n', e);
					return attribute.value;
				} finally {
					$scope.$dependencyChangeFunction = null;
				}
			};
			
			// set attribute to result
			attribute.value = getResult();
			
			// ---------- Register Unload Actions ----------
			// remove all references when this scope gets unloaded
			$scope.whenUnload.then(() => {
				const parentCleaner = (obj) => {
					if (obj.$parent) {
						parentCleaner(obj.$parent)
					}
					obj.$callbackMap.changeOnce.forEach(set => set.delete(onchange));
				}
				parentCleaner($scope);
			});
		})
	});
}


// collect all the next nodes that have {{}} syntax
function getTextNodes(root) {
	const pattern = /{{.*}}/;
	const textNodeTreeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, (node) => 
		pattern.exec(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP // NOSONAR
	);
	const textNodes = [];
	let textNodeTreeWalkerNode;
	while (textNodeTreeWalkerNode = textNodeTreeWalker.nextNode()) textNodes.push(textNodeTreeWalkerNode);
	
	return textNodes;
}


// collect all the nodes with attributes that have {{}} syntax
function getNodeAttributesMap(root) {
	let attributeNodetreeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, (node) => 
		node.attributes.length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
	);
	let nodeAttributesMap = new Map();
	
	// check root node
	// important for things like <option mv-each="val in vals" value="{{$scope.val}}">{{$scope.val}}</option>
	let attributeNodetreeWalkerNode = attributeNodetreeWalker.currentNode;
	do {
		let attributes = Array.from(attributeNodetreeWalkerNode.attributes).filter((attribute) => /{{.*}}/.exec(attribute.value)); // NOSONAR
		if (attributes.length) {
			nodeAttributesMap.set(attributeNodetreeWalkerNode, attributes);
		}
	} while (attributeNodetreeWalkerNode = attributeNodetreeWalker.nextNode());
	
	return nodeAttributesMap;
}