import { scopeGet } from './scope-get.js'
import { scopeSet } from './scope-set.js'
import { scopeDelete } from './scope-delete.js'
import { Logger } from './logger.js';

export function createScope(parent, originalObject, label, propertyName) {
	
	// resolve function for scope unload
	let unload;
	
	// unload promise, resolved manually by calling unload()
	const unloadPromise = new Promise((resolve, reject) => {
		unload = async (result) => {
			unloadPromise.finally(() => {
				Logger.scopeRemove && console.debug('%c' + label, Logger.css.remove(originalObject.$depth));
				
				// unload the kids
				// the remove themselves from this set
				const childrenUnloads = [];
				for(const child of originalObject.$children){
					childrenUnloads.push(child.$unload());
				};
				
				// empty nest
				// perform actual teardown of scope, tbd
				// should the proxy be revoked?
				Promise.all(childrenUnloads).then(() => {
					Logger.scopeRemove && console.debug('%c' + label, Logger.css.remove(originalObject.$depth), 'revoke');
					revoke();
				});
			});
			resolve(result);
			
			await unloadPromise;
		}
	});
	
	// ---------- Scope Properties ----------
	// defaults { configurable: false, enumerable: false, writable: false }
	Object.defineProperties(originalObject, {
		// for logging
		$label: { value: label },

		// to allow upward scope visibility
		$parent: { value: parent },
		
		// to allow downward scope visibility -- needed for unloads
		$children: { value: new Set() },
		
		// add $depth by traversing $parents - useful for logging indents and debug
		$depth: { value: (() => {
				const parentClimber = (obj, depth) => obj.$parent ? parentClimber(obj.$parent, depth + 1) : depth;
				return parent ? parentClimber(parent, 1) : 0;
			})()
		},
		
		// router storage
		// sequential array that should correspond to mv-page elements 1-to-1
		// the first mv-page will look at $scope.$routers[0], the seond will look at $scope.routers[1] etc
		$routers: { value: [] },
		
		// ---------- Fluent Route Builder ----------
		// $scope.addRoute()
		//   .when('/admin').assert(hasAdminRights).then('admin.html','admin')
		//   .when('/home').goto('/')
		//   .when('/').then('splash.html')
		//   .when('/login').assert(isLoggedOut).then('login.html', 'login')
		//   .otherwise('/')
		addRouter: { value: () => {
				// temporary route being built
				let route;
				
				// if true proceed with route goto/load
				const assert = (test) => {
					route.test = test;
					return { goto, load };
				}
				
				// redirect, set new pathname and add to route array
				const goto = (newPathname) => {
					route.newPathname = newPathname;
					router.routes.push(route);
					return router;
				}
				
				// load page, set template src and init, add to route array
				const load = (templateSource, templateFunction) => {
					route.templateSource = templateSource;
					route.templateFunction = templateFunction;
					router.routes.push(route);
					return router;
				}
				
				// fluent pattern route builder
				const router = {
					when: (pathname) => router.whenMatch(`^${pathname}$`),
					otherwise: (pathname) => router.whenMatch('.').goto(pathname),
					whenMatch: (pattern) => {
						route = { pattern, test: true };
						return { assert, goto, load };
					},
					routes: []
				}
				
				// add to list of routers on the $scope
				originalObject.$routers.push(router);
				
				return router;
		}},
		
		// allows dependents to add .then() for scope unload
		whenUnload: { value: unloadPromise },
		
		// unloads the scope
		$unload: { value: unload },
		
		// when this is set and dependencies are access, the function gets added as a call back onchange
		$dependencyChangeFunction: { value: null, writable: true },
		
		// callback storage
		// using a Set() is important because of multi access syntax like {{ arr.length == 0 ? 'none' : (arr.length < 10 ? 'small' : 'large') }}
		// adding the same watch function multiple times in a Set won't cause duplicates
		$callbackMap: {
			value: {
				load: new Map(), // property => Set() of callbacks
				change: new Map(), // property => Set() of callbacks
				changeOnce: new Map(), // property => Set() of callbacks
				changeOnceDOM: new Map(), // property => Set() of callbacks
				shift: new Set(),
				pop: new Set(),
				unshift: new Set(),
				push: new Set(),
				sort: new Set(),
				reverse: new Set(),
				splice: new Set(),
				copyWithin: new Set(),
				fill: new Set()
			}
		},
		
		// add callback to event collection
		on: {value: (eventName, arg1, arg2) => {
			if (['load', 'change', 'changeOnce', 'changeOnceDOM'].includes(eventName)) {
				// create a Set if it's empty
				if (!(originalObject.$callbackMap[eventName].get(arg1) instanceof Set)) {
					originalObject.$callbackMap[eventName].set(arg1, new Set());
				}
				originalObject.$callbackMap[eventName].get(arg1).add(arg2);
			} else {
				originalObject.$callbackMap[eventName].add(arg1);
				if (eventName === 'load') console.warn(arg1);
			}
		}},
		
		// execute callbacks for event
		// has to be a function so we can reference arguments for array mutations
		trigger: {value: function(eventName, key) {
			let callbackCount = 0;
			let endOfStackCount = 0;
			let logEvent;
			let callbacks;
			let args;
			
			if (eventName === 'change') {
				logEvent = [eventName, key];
				// push all the dom changes to the end of the stack
				Array.from(originalObject.$callbackMap['changeOnceDOM'].get(key) || []).forEach((callback, index) => {
					endOfStackCount++;
					// successfully queued callbacks will run the callback and this logger function with the sleeping icon
					// attempting to queue the same callback doesn't work
					// it will be skipped and run this logger funcioning with the skipping icon
					addToEndOfStack(callback, icon =>
						Logger.scopeInvoke && console.debug('%c' + label, Logger.css.invoke(originalObject.$depth), ...logEvent, 'callback', callbackCount++, icon)
					);
				});
				originalObject.$callbackMap['changeOnceDOM'].delete(key);
				
				// merge 'change' and 'changeOnce'
				callbacks = new Set([
					...(originalObject.$callbackMap['change'].get(key) || []),
					...(originalObject.$callbackMap['changeOnce'].get(key) || [])
				]);
				args = [originalObject[key]];
				
				// remove one-time callbacks
				originalObject.$callbackMap['changeOnce'].delete(key);
			} else if (eventName === 'load') {
				// similar to change
				logEvent = [eventName, key];
				callbacks = new Set([...(originalObject.$callbackMap['load'].get(key) || [])]);
			} else {
				logEvent = [eventName];
				// sets are live and need to be disassociated
				// callback #1 could add callback #2 during the loop
				callbacks = new Set([...originalObject.$callbackMap[eventName]]);
				args = Array.from(arguments).slice(1);
			}
			
			Logger.scopeInvoke && (Logger.noCallbacks || callbacks.size + endOfStackCount > 0)
				&& console.debug('%c' + label, Logger.css.invoke(originalObject.$depth), ...logEvent, 'callbacks', callbacks.size + endOfStackCount);

			// call each, include any additional arguments
			callbacks.forEach(callback => {
				Logger.scopeInvoke && console.debug('%c' + label, Logger.css.invoke(originalObject.$depth), ...logEvent, 'callback', callbackCount++);
				callback.apply(originalObject, args);
			});
		}}
	});

	Logger.scopeCreate && console.debug('%c' + label, Logger.css.create(originalObject.$depth), originalObject.toJSON ? originalObject.toJSON() : '');
	
	const proxyHandler = {
		get: scopeGet,
		set: scopeSet,
		deleteProperty: scopeDelete,
		apply(target, thisArg, argumentsList) {
			// may require intervention, tbd
			console.warn('APPLY!!', target, thisArg, argumentsList);
			return Reflect.apply(target, thisArg, argumentsList);
		}
	};
	const { proxy, revoke } = Proxy.revocable(originalObject, proxyHandler);

	// adding proxy + propertyName to handler
	// 1) so setter can provide proxy parent to new object
	// 2) so getter can flag other dependent attributes during traversal
	// 3) so getter for mutating methods can trigger change from parent on propertyName
	proxyHandler.$scope = proxy;
	proxyHandler.propertyName = propertyName;

	if (parent) {
		// expects object to have $unload function
		parent.$children.add(proxy);
		originalObject.whenUnload.then(() => parent.$children.delete(proxy));
	}
	
	return proxy;
}

// ---------- Execute At End Of Call Stack ----------
// imagine...
//   in js... $scope.dimensions.height = 100; $scope.dimensions.width = 100;
//   in html... <div>Area: {{$scope.dimensions.height * $scope.dimensions.width}}</div>
// if mulitple triggers fire the same dom change, it's better to fire the change only once
// this is a global Set of change functions so multiple pushes of the same function would just overwrite eachother
// on trigger we flag an end of call stack action to run through the Set for dom updates
const endOfStackChanges = new Set();
let changesQueued = false;
function addToEndOfStack(changeFunction, loggerCallback){
	if (endOfStackChanges.has(changeFunction)) {
		endOfStackChanges.add(() => loggerCallback(Logger.icon.skipping));
		return;
	}
	endOfStackChanges.add(changeFunction);
	
	// one time queue of the end of stack run
	if (!changesQueued) {
		changesQueued = true; // flag so it only runs once
		Promise.resolve().then(() => {
			const clonedSet = new Set(endOfStackChanges);
			endOfStackChanges.clear();
			changesQueued = false; //flag so we can do it again
			loggerCallback(Logger.icon.sleeping);
			clonedSet.forEach((callback) => callback()); // execute the changes
		});
	}
}