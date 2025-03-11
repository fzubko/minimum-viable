import { Logger } from './logger.js';

export function scopeGet(target, property, receiver) {
	const watching = target.$dependencyChangeFunction !== null ? Logger.icon.watching : '';
	
	// ---------- Logging Internals Short Circuit ----------
	if (['$label', '$depth'].includes(property)) return target[property];
	
	// log access to enumerable properties
	if (Logger.innumerable || target.propertyIsEnumerable(property)) {
		Logger.scopeAccess && console.debug('%c' + target.$label + '%c' + Logger.caller, Logger.css.access(target.$depth), Logger.css.caller, property, '=', Logger.redact(target[property]), watching);
	}
	
	// ---------- Track Dependency Access ----------
	// if we're watching for access, register the onchange for the property
	if (target.$dependencyChangeFunction !== null) {
		target.on('changeOnceDOM', property, target.$dependencyChangeFunction);
		
		// may be traveling further into nested properites
		// push the dependency change function ahead and remove it when this one gets removed
		if (typeof target[property] === 'object' && target[property] != null) {
			target[property].$dependencyChangeFunction = target.$dependencyChangeFunction;
			target.on('changeOnce', '$dependencyChangeFunction', () => target[property].$dependencyChangeFunction = null);
		}
	}
	
	// ---------- Object To Primitive ----------
	// if there's a debug attempt to just display an object like {{$scope.object}}
	if (typeof target === 'object' && property === 'toString' && typeof target[property] === 'function' && target[property]() === '[object Object]') {
		return () => JSON.stringify(this.$scope);
	}
	
	
	
	// ---------- Date ----------
	if (target instanceof Date && typeof property === 'string' && typeof target[property] === 'function') {
		if (property.startsWith('set')) {
			return (...args) => {
				const stringBefore = target.toString();
				const result = Date.prototype[property].apply(target, args);
				if (stringBefore !== result.toString()) {
					target.$parent.trigger('change', this.propertyName);
				}
				return result;
			};
		}

		// have to bind getters to the date instance
		// the internals use 'this' and it throws a TypeError if it's not a date
		if (/^get|^to|^valueOf$/.exec(property)) {
			return target[property].bind(target);
		}
	}
	
	// ---------- Array Mutating Method Monkey Patch ----------
	// if they're getting an array mutating method, monkey patch it and trigger change on that method
	// mv-each registers callbacks against these
	if (target instanceof Array) {
		
		// ---------- Unshift / Push Mutation ----------
		if (['unshift', 'push'].includes(property)) {
			return (...args) => {
				const result = Array.prototype[property].apply(target, args);
				target.trigger(property, ...args);
				target.trigger('change', 'length')
				return result;
			}
		}
		
		// ---------- Shift / Pop Mutation ----------
		if (['shift', 'pop'].includes(property)) {
			return (...args) => {
				const result = Array.prototype[property].apply(target, args);
				target.trigger(property, ...args);
				target.trigger('change', 'length');
				return result;
			}
		}
		
		// ---------- Reverse Mutation ----------
		if (['reverse'].includes(property)) {
			return (...args) => {
				const result = Array.prototype[property].apply(target, args);
				target.trigger(property, ...args);
				// same length and no change in the items, they only moved
				target.trigger('change', 'toJSON');
				return result;
			}
		}
		
		// ---------- Sort Mutation ----------
		// doing a merge sort that returns the index moves
		// e.g. ['Jan','Feb','Mar','Apr'] sorts to ['Apr','Feb','Jan','Mar']
		// the indexes [0, 1, 2, 3] sort to [3, 1, 0, 2] << this is what's returned and passed to trigger
		// the trigger needs that so that any loosely coupled data can be sorted identically
		if (['sort'].includes(property)) {
			return (compare) => {
				const indices = sortIndices(target, compare);
				target.trigger('sort', indices); // trigger sort with index moves
				// same length and no change in the items, they only moved
				target.trigger('change', 'toJSON');
				return target;
			}
		}
		
		// ---------- Splice Mutation ----------
		if (['splice'].includes(property)) {
			return (start, deleteCount, ...newItems) => {
				const result = Array.prototype[property].apply(target, [start, deleteCount, ...newItems]);
				target.trigger(property, start, deleteCount, ...newItems);
				
				if (deleteCount != newItems.length) target.trigger('change', 'length');
				if (deleteCount + newItems.length > 0 ) target.trigger('change', 'toJSON');
				return result;
			}
		}

		// ---------- CopyWithin Mutation ----------
		if (['copyWithin'].includes(property)) {
			return (index, start, end = target.length) => {
				const result = Array.prototype[property].apply(target, [index, start, end]);
				target.trigger(property, index, start, end);
				
				if (index < target.length && end - start > 0) target.trigger('change', 'toJSON');
				return result;
			}
		}
		
		// ---------- Fill Mutation ----------
		if (['fill'].includes(property)) {
			return (value, start, end = target.length) => {
				const result = Array.prototype[property].apply(target, [value, start, end]);
				target.trigger(property, value, start, end);
				
				if (start < target.length && end - start > 0) target.trigger('change', 'toJSON');
				return result;
			}
		}
	}
		
	// ---------- Property Value ----------
	return Reflect.get(target, property, receiver);
}



// ---------- Merge Sort Mutation Returning Indices ----------
// sorting ['Jan','Feb','Mar','Apr'] should mutate the array and return [3,1,0,2]
// console.assert(JSON.stringify(sortIndices(['Jan','Feb','Mar','Apr'])) == JSON.stringify([3,1,0,2]));
function sortIndices(arr, compare = (a, b) => String(a).localeCompare(b)) {
  const originalIndices = arr.map((_, index) => index);

  // merge two sorted subarrays
  function merge(arr, indices, start, mid, end) {
    let i = start; // left subarray
    let j = mid + 1; // right subarray

    // while both subarrays have elements to compare
    while (i <= mid && j <= end) {
      // check em out
      if (compare(arr[i], arr[j]) <= 0) {
        i++; // already in order, skip it
      } else { // move it
        let index = j; // start here

        while (index > i) {
          // destructuring assignment swaps
          [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
          [indices[index], indices[index - 1]] = [indices[index - 1], indices[index]];
          index--; // move left toward i
        }
				i++;
        mid++;
        j++;
      }
    }
  }

  // recusively sort 2 halves and merge
  function sort(arr, indices, start, end) {
    if (start < end) {
      const mid = Math.floor((start + end) / 2);

      sort(arr, indices, start, mid);
      sort(arr, indices, mid + 1, end);

      merge(arr, indices, start, mid, end);
    }
  }
  
  sort(arr, originalIndices, 0, arr.length - 1);
  
  return originalIndices;
}