import { Logger } from './logger.js';
import { createScope } from './scope.js';
import { interpolate } from './interpolate.js';

export function mvEach(root, $scope) {
	// an mv-each can be nested under another mv-each
	// we need to process 1, start over, process another
	// that way if one gets removed, it takes out any nested ones with it
	const nodes = (function* (){
		while (true) {
			const node = root.querySelector(':scope [mv-each]');
			if (!node) break;
			yield node;
		}
	})();
	
	for (const node of nodes){
		const statement = node.getAttribute('mv-each');
		const label = `mv-each="${statement}"`;

		// ---------- Comment / Cleanup----------
		const comment = document.createComment(label); // acts as an origin point if the array ever becomes empty
		node.before(comment);
		node.removeAttribute('mv-each');
		
		// ---------- Setup ----------
		// each item will be a clone of original node
		// each item will get their own scope
		// the itemName will be added to that scope
		// there is a separate list of clones and scopes
		// when the original array changes, the clones and scopes get changed
		const itemName = statement.split(' in ')[0];
		const listPath = statement.split(' in ')[1];
		const $listOwner = listPath.split('.').slice(0, -1).reduce((obj, key) => obj[key], $scope);
		const listName = listPath.split('.').pop();
		const cloneLabel = $scope.$label + `.${listPath}[${itemName}]`;
		const clones = [];
		const scopes = [];
		let length = 0;
		
		// ---------- Validation Short Circuit ----------
		if (statement.split(' in ').length !== 2) {
			node.classList.add('broken');
			return Logger.eachBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), 'improper mv-each statement');
		}
		if (!$listOwner[listName]) {
			node.classList.add('broken');
			return Logger.eachBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), `no list named '${listPath}'`);
		}
		node.remove();
		
		Logger.eachCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
		
		// ---------- Create ----------
		function createClone(index, itemValue){
			const nodeBefore = index == 0 ? comment : clones[index - 1];
			
			// splice in a new one
			Logger.eachCreate && console.debug(`%c${label}[${index}]%c${Logger.caller}`, Logger.css.create($scope.$depth), Logger.css.caller);
			clones.splice(index, 0, node.cloneNode(true)); // true = deep clone
			scopes.splice(index, 0, createScope($scope, {[itemName]: itemValue}, cloneLabel));
			
			// add to dom + interpolate
			nodeBefore.after(clones[index]);
			interpolate(clones[index], scopes[index]); // async call

			// when the value changes in the parent/list... push it down to the item scope
			const changeFunction = (newItem) => scopes[index][itemName] = newItem;
			$listOwner[listName].on('change', '' + index, changeFunction);
			
			// this part is a little complicated because the items have 2 dependencies, the list and the scope
			// requirements...
			// #1) the list is expected to exist when the item unloads to remove the change function
			//     this supports individual item changes/cleanup in-place when the list doesn't unload
			// #2) for upward visibility, the item $parent it has to be the scope
			//     the list doesn't work because nested mv-eachs appear as siblings even though there's an item dependency
			// #3) the item has to unload when either the list unloads or the scope unloads
			//     but it can't unload twice
			//     if there's a page unload, the list goes first
			// #4) unloads should be asynchronous to handle a lot of elements
			//     that means unloading from one dependency can't unobligate the other

			// when the item scope unloads, remove the change function from the parent
			scopes[index].whenUnload.then(() => {
				try {
					$listOwner[listName].$callbackMap.change.get('' + index).delete(changeFunction);
				} catch(e) {
					if (!(e instanceof TypeError)) // suppress revoked proxy TypeError, since list unloads before its item scopes unload
						throw e;
				}
			});
			
			length++;
		}
		
		// ---------- Remove ----------
		function removeClone(index){
			if (length === 0) return false;
			
			const clone = clones.splice(index, 1)[0];
			const scope = scopes.splice(index, 1)[0];
			length--;
			
			try {
				Logger.eachRemove && console.debug('%c' + label + '%c' + Logger.caller, Logger.css.remove($scope.$depth), Logger.css.caller, index);
				// in a nested each, the scope is a list item which may have been unloaded
			} catch (e) {
				if (!(e instanceof TypeError)) // suppress revoked proxy TypeError, since list unloads before its item scopes unload
					throw e;
			}
			try {
				clone.remove();
				scope.$unload(); // async call
			} catch (e) {
				if (!(e instanceof TypeError)) // suppress revoked proxy TypeError, since list unloads before its item scopes unload
					throw e;
			}
			return true;
		}
		
		// ---------- Array Mutations ----------
		const mutationMap = {
			// ---------- Unshift ----------
			'unshift': (...newItems) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'unshift x', newItems.length);
				newItems.toReversed().forEach(itemValue => createClone(0, itemValue));
			},
			// ---------- Push ----------
			'push': (...newItems) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'push x', newItems.length);
				newItems.forEach(itemValue => createClone(length, itemValue));
			},
			// ---------- Shift ----------
			'shift': () => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'shift');
				removeClone(0)
			},
			// ---------- Pop ----------
			'pop': () => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'pop');
				removeClone(length - 1)
			},
			// ---------- Reverse ----------
			'reverse': () => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'reverse');
				clones.forEach(clone => comment.after(clone));
				clones.reverse();
				scopes.reverse();
			},
			// ---------- Sort ----------
			'sort': (indices) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'sort');
				reorder(clones, indices);
				reorder(scopes, indices);
				clones.forEach((clone, index) => {
					(index === 0 ? comment : clones[index - 1]).after(clone);
				});
			},
			// ---------- Splice ----------
			'splice': (start, deleteCount, ...newItems) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'splice', start, deleteCount, newItems.length);
				for (let i = 0; i < deleteCount && start < length; i++) {
					removeClone(start);
				}
				newItems.forEach((itemValue, index) => {
					createClone(start + index, itemValue);
				});
			},
			// ---------- CopyWithin ----------
			'copyWithin': (target, start, end = length) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'copyWithin', target, start, end);
				for (let i = 0; target + i < length && i < end - start; i++) {
					removeClone(target + i);
					createClone(target + i, $listOwner[listName][target + i]);
				}
			},
			// ---------- Fill ----------
			// mdn says object fills will all be same object
			// need to think about that
			// each one should be its own proxy/scope
			'fill': (value, start, end = length) => {
				Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'fill', Logger.redact(value), start, end);
				for (let i = start; i < length && i < end; i++) {
					removeClone(i);
					createClone(i, value);
				}
			}
		}

		// ---------- Length Change ----------
		// there's no change registered for an index beyond the length because that index doesn't exist
		// the length will change though
		const lengthChange = (newLength = $listOwner[listName][length]) => {
			Logger.eachUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'length', length, '>>', newLength);
			while (length < newLength) createClone(length, $listOwner[listName][length]);
			while (length > newLength) removeClone(length - 1);
		};

		// ---------- Load Event ----------
		// build it and register all the onchange events
		const onload = () => {
			// list may have been replaced with a new list
			// purge existing
			while (length > 0) removeClone(length - 1);
			
			// forEach skips empty values -- no skips here
			for (let index = 0; index < $listOwner[listName].length; index++) {
				createClone(index, $listOwner[listName][index]);
			}
			
			$listOwner[listName].on('change', 'length', lengthChange);
			for (const [name, method] of Object.entries(mutationMap)) {
				$listOwner[listName].on(name, method);
			}
		}
		
		// ---------- Change Event ----------
		// looking for nullish list so we can unload
		const onchange = newList => {
			if(!newList) {
				while (length > 0) {
					console.warn('length =',length,'removing');
					removeClone(length - 1);
					console.warn('  good');
				}
			}
		}
		
		// ---------- Scope Unload Event ----------
		// clean up the hooks
		$scope.whenUnload.then(() => {
			$listOwner?.[listName].$callbackMap.change.get('length').delete(lengthChange);
			$listOwner.$callbackMap.load.get(listName).delete(onload);
			$listOwner.$callbackMap.load.get(listName).delete(onchange);
		});
		for (const [name, method] of Object.entries(mutationMap)) {
			$scope.whenUnload.then(() => $listOwner?.[listName].$callbackMap[name].delete(method));
		}
		
		// wire & run
		$listOwner.on('change', listName, onchange);
		$listOwner.on('load', listName, onload);
		if ($listOwner[listName]) onload();
	}
}


// ---------- Reorder Mutation ----------
function reorder(arr, indices) {
  arr.map(
		(item, index) => arr[indices[index]]
	).forEach(
		(item, index) => arr[index] = item
	);
	return arr;
}