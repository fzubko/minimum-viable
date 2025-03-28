export function mvStart(init){
        
        const $rootScope = createScope(null, {}, '$rootScope');
        
        const onLoad = () => {
                const path = document.baseURI.replace(document.location.origin, '');
                const html = document.getElementsByTagName('html')[0];
                html.classList.add('loading');
                interpolate(html, $rootScope, path).then(() => html.classList.remove('loading'));
                removeEventListener('load', onLoad);
        };
        addEventListener('load', onLoad);

        if (init) init($rootScope);
}

export const Logger = {
        css: {
                caller: 'color: #888; margin-left: 0.5rem;',
                create: depth => 'background: #073; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : ''),
                access: depth => 'background: #048; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : ''),
                invoke: depth => 'background: #088; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : ''),
                update: depth => 'background: #770; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : ''),
                remove: depth => 'background: #850; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : ''),
                broken: depth => 'background: #A00; color: #fffd; padding: 0 0.3rem; border-radius: 0.3rem;' + (depth ? 'margin-left: ' + (depth * 1.5) + 'rem;' : '')
        },
        icon: {
                // https://www.utf8-chartable.de/unicode-utf8-table.pl?start=127744&number=1024
                // U+HEXSTUFF becomes 0xHEXSTUFF
                watching: String.fromCodePoint(0x1F440),
                sleeping: String.fromCodePoint(0x1F4A4),
                skipping: String.fromCodePoint(0x21BA)
        },
        noCallbacks: false,
        innumerable: false,
        scopeCreate: false,
        scopeAccess: false,
        scopeInvoke: false,
        scopeUpdate: false,
        scopeRemove: false,
        scopeBroken: true,
        set scope(value){
                Logger.scopeCreate = value;
                Logger.scopeAccess = value;
                Logger.scopeInvoke = value;
                Logger.scopeUpdate = value;
                Logger.scopeRemove = value;
                Logger.scopeBroken = value;
        },
        textCreate: false,
        textUpdate: false,
        textRemove: false,
        textBroken: true,
        set text(value){
                Logger.textCreate = value;
                Logger.textUpdate = value;
                Logger.textRemove = value;
                Logger.textBroken = value;
        },
        templateCreate: false,
        templateInvoke: false,
        templateUpdate: false,
        templateBroken: true,
        set template(value){
                Logger.templateCreate = value;
                Logger.templateInvoke = value;
                Logger.templateUpdate = value;
                Logger.templateBroken = value;
        },
        pageCreate: false,
        pageUpdate: false,
        pageBroken: true,
        set page(value){
                Logger.pageCreate = value;
                Logger.pageUpdate = value;
                Logger.pageBroken = value;
        },
        eventCreate: false,
        eventInvoke: false,
        set event(value){
                Logger.eventCreate = value;
                Logger.eventInvoke = value;
        },
        eachCreate: false,
        eachUpdate: false,
        eachRemove: false,
        eachBroken: true,
        set each(value){
                Logger.eachCreate = value;
                Logger.eachUpdate = value;
                Logger.eachRemove = value;
                Logger.eachBroken = value;
        },
        ifCreate: false,
        ifUpdate: false,
        ifRemove: false,
        ifBroken: true,
        set if(value){
                Logger.ifCreate = value;
                Logger.ifUpdate = value;
                Logger.ifRemove = value;
                Logger.ifBroken = value;
        },
        set all(value){
                Logger.noCallbacks = value;
                Logger.innumerable = value;
                Logger.scope = value;
                Logger.text = value;
                Logger.template = value;
                Logger.page = value;
                Logger.event = value;
                Logger.each = value;
                Logger.if = value;
                if (value) Logger.legend();
        },
        legend(){
                console.debug('Logger Legend%ccreate%caccess%cinvoke%cupdate%cremove%cbroken',Logger.css.create(0.5),Logger.css.access(0.5),Logger.css.invoke(0.5),Logger.css.update(0.5),Logger.css.remove(0.5),Logger.css.broken(0.5));
                console.debug(Logger.icon.watching, 'watching, callback is registered for changes');
                console.debug(Logger.icon.sleeping, 'sleeping, callback waited until end of stack to execute');
                console.debug(Logger.icon.skipping, 'skipping, skipped callback, this one was already queued at the end of the stack');
        },
        redact(value){
                let result = value;
                ['function', 'object'].forEach((type) => result = typeof value === type && value != null ? '|' + type + '|' : result);
                return result;
        },
        get caller(){
                // 0 = Error
                // 1 = get caller (this method)
                // 2 = the method that called this, probably aware of self
                // 3 = the method we're after
                // it'll be something like 'at url/file.js:line:column
                try {
                        return /[a-zA-Z0-9_-]+\.\w+:\d+/.exec(new Error().stack.split('\n')[3])[0]; // NOSONAR
                } catch (e) {
                        return '';
                }
        }
}

// ---------- mv-event ----------
export function evaluate($scope, event, string) {
        let f = new Function('$scope', 'event', `'use strict'; ${string};`);
        f.call(this, $scope, event);
}

// ---------- mv-if ----------
export function evaluateAsBoolean($scope, string) {
        let f = new Function('$scope', `'use strict'; return !!(${string});`);
        return f($scope);
}

// ---------- mv-text ----------
export function evaluateTemplateLiteral($scope, string) {
        let f = new Function('$scope', `'use strict'; return \`${string}\`;`);
        return f($scope);
}

export async function interpolate(node, $scope, path = '/') {

        // these all stop walking the tree when they encounter an [mv-each]
        mvHref(node);
        mvEvent(node, $scope);
        mvText(node, $scope);   
        mvBind(node, $scope);

        // there will probably be drama with the order of this execution
        mvIf(node, $scope);

        // removes elements and process them within a separate $scope
        mvEach(node, $scope);

        
        await mvTemplate(node, $scope, path);

        // page will kick off its own interpolate
        mvPage(node, $scope, path);
}

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
        
        // ---------- Nested Properties ----------
        // recursively create scopes / proxies for object properties
        Object.entries(originalObject).forEach(([key, value]) => {
                if (typeof value === 'object' && value != null && !value.hasOwnProperty('$label')) {
                        originalObject[key] = createScope(proxy, value, label + '.' + key, key);
                }
        });

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
                // convert list of arguments to list of proxies/scopes where appropriate
                const mapToScopes = args => args.map(arg => typeof arg === 'object' && arg != null && !arg.hasOwnProperty('$label') ? createScope(target, arg, target.$label + '.mutation') : arg);
                
                // ---------- Unshift / Push Mutation ----------
                if (['unshift', 'push'].includes(property)) {
                        return (...args) => {
                                args = mapToScopes(args);
                                const result = Array.prototype[property].apply(target, args);
                                target.trigger(property, ...args);
                                target.trigger('change', 'length')
                                return result;
                        }
                }
                
                // ---------- Shift / Pop Mutation ----------
                if (['shift', 'pop'].includes(property)) {
                        return (...args) => {
                                args = mapToScopes(args);
                                const result = Array.prototype[property].apply(target, args);
                                target.trigger(property, ...args);
                                target.trigger('change', 'length');
                                return result;
                        }
                }
                
                // ---------- Reverse Mutation ----------
                if (['reverse'].includes(property)) {
                        return () => {
                                const result = Array.prototype[property].call(target);
                                target.trigger(property);
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
                                newItems = mapToScopes(newItems);
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
                                value = mapToScopes([value])[0];
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

export function scopeSet(target, property, value, receiver) {

        // log enumerable property changes, functions will be redacted
        if (Logger.innumerable || !target.hasOwnProperty(property) || target.propertyIsEnumerable(property)) {
                Logger.scopeUpdate && console.debug('%c' + target.$label, Logger.css.update(target.$depth), property, '=', Logger.redact(target[property]), '>>', Logger.redact(value));
        }
        
        // ---------- No Change Short Circuit ----------
        if (target[property] === value) return true;
        
        // ---------- Dependency Tracking Setup Short Circuit ----------
        // no trigger needed when setting up the dependency tracking
        if (property === '$dependencyChangeFunction' && value != null) return Reflect.set(target, property, value, receiver);

        // ---------- Setting While Getting Error ----------
        if (target.$dependencyChangeFunction && property !== '$dependencyChangeFunction') {
                Logger.scopeBroken && console.error('%c' + target.$label, Logger.css.broken(target.$depth), `attempted update of '${property}', mv syntax should be idempotent`);
                return false;
        }
        
        // ---------- Assessment Setup ----------
        // let's see what kind of assignment we're working with
        const oldType = typeof target[property] === 'object' && target[property] != null ? 'object' : 'literal';
        const newType = typeof value === 'object' && value != null ? 'object' : 'literal';
        const newValue = newType === 'object' ? createScope(this.$scope, value, target.$label + '.' + property, property) : value;
        
        // ---------- Object >> ??? ----------
        if (oldType === 'object') {
                // scenario - setting a date with an mv-bind to null... the inputListeners need to be removed
                // scneario - setting an array = array... the mv-each has to tear down and rebuild
                // we have to wait for this to finish
                target[property].$unload().then(() => {
                        // set the value
                        Reflect.set(target, property, newValue, receiver);
                        // trigger stuff
                        target.trigger('change', property);
                        newType === 'object' && target.trigger('load', property);
                });
                return true;
        }
        
        // an array can have an index, that's beyond its length, assigned a value which extends it / changing the length
        const hasLengthChange = target instanceof Array && property >= target.length;

        // ---------- Literal >> ??? ----------
        Reflect.set(target, property, newValue, receiver);
        target.trigger('change', property);
        newType === 'object' && target.trigger('load', property);
        if (hasLengthChange) {
                target.trigger('change', 'length');
                target.trigger('change', 'toJSON');
        }
        return true;
}

export function scopeDelete(target, property) {
        Logger.scopeRemove && console.debug('%c' + target.$label, Logger.css.remove(target.$depth), property, '=', Logger.redact(target[property]));
        
        // objects have scopes
        // unload on delete and wait for it to finish
        if (typeof target[property] === 'object' && target[property] != null) {
                target[property].$unload().then(() => {
                        Reflect.deleteProperty(target, property);
                        target.trigger('change', property);
                });
                return true;
        }
        
        // literal
        const result = Reflect.deleteProperty(target, property);
        target.trigger('change', property);
        return result;
}
export function mvBind(root, $scope){
        // ---------- Form Bind ----------
        // add mv-bind to elements with names in the format form.name
        for (const form of getBindNodes(root, true)){
                const mvBindName = form.getAttribute('mv-bind');
                $scope[mvBindName] ??= {};
                
                for (const node of form.querySelectorAll(':scope :not([type=button], [type=image], [type=reset], [type=submit])[name]')){
                        const name = node.getAttribute('name');
                        $scope[mvBindName][name] ??= node.value;
                        node.setAttribute('mv-bind', mvBindName + '.' + name);
                }
        }
        
        // ---------- Regular Bind ----------
        for (const node of getBindNodes(root, false)) {
                
                // ---------- Setup ----------
                // traverse from scope through . notation to almost last position to find the owner
                // its needed to attach change and unload events
                const $owner = node.getAttribute('mv-bind').split('.').slice(0, -1).reduce((obj, key) => obj[key], $scope);
                // get the lsat one
                const mvBindName = node.getAttribute('mv-bind').split('.').pop();
                // set multi-prefix if it supports multiple
                // inputs use the type attribute or text
                // everything else is the tag name
                const type = (node.hasAttribute('multiple') ? 'multi-' : '')
                        + (node.tagName === 'INPUT' ? node.type || 'text' : node.tagName);
                
                // ---------- Listener + Onchange ----------
                // get the functions based on the node type
                let inputListener;
                let onchange;
                switch (type.toLowerCase()){
                        // ---------- Input Type = Date/Week/Month/Time ----------
                        case 'date': 
                        case 'week': 
                        case 'month':
                        case 'time': {
                                inputListener = () => {
                                        if ((node.value || null) == null) {
                                                $owner[mvBindName] = null;
                                                return;
                                        }
                                        $owner[mvBindName] = node.valueAsDate;
                                }
                                
                                onchange = newDate => {
                                        if (newDate) {
                                                // can't set it directly since newDate is Date wrapped in a Proxy
                                                node.valueAsDate = new Date(newDate.getTime());
                                        } else {
                                                node.value = null;
                                        }
                                }
                                break;
                        }

                        // ---------- Input Type = Datetime-Local ----------
                        case 'datetime-local': {
                                inputListener = () => { // yyyy-mm-ddThh:mi:ss.f to Date object
                                        if ((node.value || null) == null) {
                                                $owner[mvBindName] = null;
                                                return;
                                        }
                                        // split by - T : and .
                                        const values = node.value.split(/[-T:.]/);
                                        values[1] = values[1] - 1; // zero-based month adjustment
                                        if (values.length > 6)
                                                values[6] = values[6].padEnd(3, '0'); // hundreths padding
                                        $owner[mvBindName] = getNewUtcDate(...values);
                                }
                                
                                onchange = () => { // Date object to yyyy-mm-ddThh:mi:ss.fff, a little different than above, give more f's
                                        if ($owner[mvBindName]) {
                                                const d = new Date($owner[mvBindName].getTime());
                                                node.value =
                                                                d.getUTCFullYear() + '-' +
                                                                (d.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
                                                                d.getUTCDate().toString().padStart(2, '0') + 'T' +
                                                                d.getUTCHours().toString().padStart(2, '0') + ':' +
                                                                d.getUTCMinutes().toString().padStart(2, '0') + ':' +
                                                                d.getUTCSeconds().toString().padStart(2, '0') + '.' +
                                                                d.getUTCMilliseconds().toString().padStart(3, '0');
                                        } else {
                                                node.value = null;
                                        }
                                }
                                break;
                        }

                        // ---------- Input Type = Radio ----------
                        case 'radio': {
                                $owner[mvBindName] ??= node.value;
                                
                                inputListener = () => {
                                        $owner[mvBindName] = node.value;
                                }

                                onchange = () => {
                                        node.checked = node.value == $owner[mvBindName];
                                }
                                break;
                        }
                        
                        // ---------- Input Type = Checkbox ----------
                        case 'checkbox': {
                                $owner[mvBindName] ??= node.checked;
                                
                                inputListener = () => {
                                        $owner[mvBindName] = node.checked;
                                }
                                
                                onchange = () => {
                                        node.checked = !!$owner[mvBindName];
                                }
                                break;
                        }

                        // ---------- Input Type = File ----------
                        case 'file':
                        case 'multi-file': {
                                $owner[mvBindName] = node.files;
                                inputListener = () => {
                                        $owner[mvBindName] = node.files; // this is the thing you'd append to a new FormData() and send
                                }
                                break;
                        }

                        // ---------- Select Multiple ----------
                        case 'multi-select': {
                                $owner[mvBindName] ??= [];
                                
                                inputListener = () => {
                                        // determine at runtime - if all select options are numbers
                                        const optionsAreNumbers = Array.from(node.options).every(option => numberPattern.exec(option.value));
                                        const selectedValuesSet = new Set();
                                        
                                        // add the selected values
                                        for (const option of node.selectedOptions) {
                                                selectedValuesSet.add(optionsAreNumbers ? Number(option.value) : option.value);
                                        }
                                        
                                        // bind check
                                        for (let i = $owner[mvBindName].length; i--;) {
                                                const value = $owner[mvBindName][i];
                                                if (selectedValuesSet.has(value)) {
                                                        selectedValuesSet.delete(value); // already there, ignore
                                                } else {
                                                        $owner[mvBindName].splice(i, 1); // not selected, remove it
                                                }
                                        }
                                        
                                        // add the others that weren't found
                                        selectedValuesSet.forEach(value => $owner[mvBindName].push(value));
                                        
                                        // order the bind array based on the selected options array
                                        const selectedValuesArray = Array.from(node.selectedOptions).map(option => option.value);
                                        $owner[mvBindName].sort((a, b) => {
                                                const aIndex = selectedValuesArray.indexOf(a.toString());
                                                const bIndex = selectedValuesArray.indexOf(b.toString());
                                                return aIndex.toString().localeCompare(bIndex, void 0, { numeric: true });
                                        });
                                }
                                
                                
                                onchange = () => {
                                        // determine at runtime - if all select options are numbers
                                        const optionsAreNumbers = Array.from(node.options).every(option => numberPattern.exec(option.value));
                                        const valuesSet = new Set($owner[mvBindName]);
                                        
                                        // option.selected = it exists in bind set
                                        for (const option of node.options) {
                                                option.selected = valuesSet.has(optionsAreNumbers ? Number(option.value) : option.value);
                                        }
                                }
                                break;
                        }


                        // ---------- Basic Number Type ----------
                        case 'number':
                        case 'range': {
                                $owner[mvBindName] ??= node.valueAsNumber;
                                
                                inputListener = () => {
                                        $owner[mvBindName] = node.valueAsNumber
                                }
                                onchange = () => {
                                        node.value = $owner[mvBindName]
                                }
                                break;
                        }
                        
                        // ---------- Basic String Type ----------
                        case 'color':
                        case 'email':
                        case 'hidden':
                        case 'password':
                        case 'search':
                        case 'select':
                        case 'tel':
                        case 'text':
                        case 'textarea':
                        case 'url': {
                                $owner[mvBindName] ??= node.value;
                                
                                inputListener = () => {
                                        $owner[mvBindName] = node.value
                                }
                                onchange = () => {
                                        node.value = $owner[mvBindName]
                                }
                                break;
                        }

                        // ---------- Unsupported ----------
                        default: {
                                console.error('Unsupported mv-bind', node);
                        }
                }
                
                node.addEventListener('input', inputListener);
                $scope.whenUnload.then(() => node.removeEventListener('input', inputListener));
                
                // file inputs don't have onchange, make sure it exists first
                if (onchange) {
                        onchange($owner[mvBindName]);
                        $owner.on('change', mvBindName, onchange);
                }
                
                if (type.toLowerCase() === 'multi-select') {
                        ['unshift','push','shift','pop','splice','copyWithin','fill'].forEach(method => {
                                $owner[mvBindName].on(method, onchange);
                        });
                        $owner[mvBindName].on('change', 'length', onchange);
                }
        }
}

const numberPattern = new RegExp(/^(-?(0|[1-9]\d*)(\.\d+)?|\.\d+)$/);

function* getBindNodes(root, isForm) {
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
                node.hasAttribute('mv-each')
                ? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
                : (
                        node.nodeName === 'FORM' === isForm && node.hasAttribute('mv-bind')
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP
                )
        )
        
        while(treeWalker.nextNode()) yield treeWalker.currentNode;
}

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
                        // mv-if swaps a comment into the dom, if that happened, $domAnchor will be set
                        (nodeBefore.$domAnchor ?? nodeBefore).after(clones[index]);
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
                for (const node of getEventNodes(root, attribute)){
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

function* getEventNodes(root, attribute) {
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

export function mvHref(root) {
        for (const node of getHrefNodes(root)){
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

function* getHrefNodes(root) {
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

export function mvPage(root, $scope, path) {
        // mv-page element might be good for tab content
        
        // imagine going to a unit / section / list and keeping headers there but updating subcontent
        // tabs...unless you wanted to keep them loaded but hidden
        // probably cheap to reload
        // and then you can put actual urls on the tabs istead of #
        // inset/outset state by url
        // page is tab content
        root.querySelectorAll(':scope [mv-page]').forEach((node, index) => {
                const label = node.outerHTML;
                const router = $scope.$routers[index];
                
                // ---------- No Page Router ----------
                if (!$scope.$routers[index]) {
                        node.classList.add('broken');
                        return Logger.pageBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), 'no router');
                }

                Logger.pageCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
                
                let currentRoute;
                let currentPageScope;
                const handleRouteChange = (event) => {
                        // base element href
                        const baseHref = document.baseURI.replace(document.location.origin, '').slice(0, -1);
                        
                        // find the matching route
                        const route = router.routes.find(route => {
                                if (!new RegExp(route.pattern).test(document.location.pathname.replace(baseHref, ''))) {
                                        return false; // route pattern doesn't match
                                }
                                if (!route.test) {
                                        return false; // test is empty or already false
                                }
                                if (typeof route.test === 'function') {
                                        return (async () => await route.test())(); // wait for results
                                }
                                return route.test;
                        });
                        
                        // ---------- Same Route Short Circuit ----------
                        // prevents reloading parent routes
                        // useful when you go from /parent/child1 to /parent/child2 and only the nested page should change
                        if (currentRoute == route) return;
                        
                        currentRoute = route;
                        Logger.pageUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), document.location.pathname, route);
                        if (currentPageScope) {
                                currentPageScope.$unload();
                                currentPageScope = null;
                        }
                        node.innerHTML = '';
                        
                        // ---------- No Route ----------
                        if (!route) return;
                        
                        // ---------- Redirect Short Circuit ----------
                        if (route.newPathname){
                                if (route.newPathname != location.pathname) {
                                        history.pushState('', '', baseHref + route.newPathname);
                                        dispatchEvent(new Event('popstate'));
                                }
                                return;
                        }
                        
                        // ---------- Add Page To DOM ----------
                        const page = document.createElement('div');
                        page.setAttribute('mv-template', route.templateFunction ?? '');
                        page.setAttribute('src', route.templateSource);
                        node.appendChild(page);
                        
                        Logger.pageCreate && console.debug('%c' + label, Logger.css.update($scope.$depth), route.templateSource, route.templateFunction ?? '');
                        
                        // callback isn't reliable
                        mvTemplate(node, $scope, path).then(newTemplateScopes => {
                                currentPageScope = newTemplateScopes[0];
                                if (document.location.hash && document.querySelector(document.location.hash)) {
                                        document.querySelector(document.location.hash).scrollIntoView();
                                }
                        });
                }
                
                addEventListener('popstate', handleRouteChange);
                handleRouteChange();
        });
}

// ---------- Promise Caches ----------
const templatePromiseCache = {}; // template import promises indexed by mv-template src attribute
const templateScriptCache = {}; // import promises indexed by script src attribute
const templateCssCache = {}; // import promises indexed by link href attribute

// ---------- Data Caches ----------
const templateCache = {}; // template objects indexed by mv-template src attribute
const templateModuleCache = {}; // js modules indexed by mv-template src attribute

export async function mvTemplate(root, $scope, path) {
        const templateNodes = Array.from(root.querySelectorAll(':scope [mv-template]'));
        
        if (root.matches('[mv-template]')) templateNodes.unshift(root);
        
        async function loadTemplate(node) {
                const src = node.getAttribute('src');
                const nodeSrc = (src.startsWith('/') ? '' : path) + src; // template location, if src is absolute, ignore the path parameter, otherwise use it as a prefix
                const absoluteDirectory = nodeSrc.split('/').slice(0, -1).map(d => d + '/').join('');
                const init = node.getAttribute('mv-template'); // optional start up function that recieves $scope parameter
                const label = `mv-tempate=${init} ${nodeSrc}`;
                const templateScope = createScope($scope, {}, nodeSrc); // new scope for each template

                // ---------- Missing SRC ----------
                if (!nodeSrc) {
                        node.classList.add('broken');
                        return Logger.templateBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), 'missing [src] attribute');
                }

                Logger.templateCreate && console.debug('%c' + label, Logger.css.create($scope.$depth));
                node.classList.add('loading');

                // ---------- Comment / Cleanup----------
                const comment = document.createComment(label);
                node.before(comment);
                node.removeAttribute('mv-template');

                // ---------- Template Fetch ----------
                if (!templatePromiseCache[nodeSrc]) {
                        templatePromiseCache[nodeSrc] = fetch(nodeSrc);
                        templateCache[nodeSrc] = document.createElement('template');
                        templateCache[nodeSrc].innerHTML = await templatePromiseCache[nodeSrc].then(response => response.ok ? response.text() : '');
                }
                
                // ---------- Load Resources ----------
                const scriptTags = Array.from(templateCache[nodeSrc].content.querySelectorAll('script'));
                const cssTags = Array.from(templateCache[nodeSrc].content.querySelectorAll('link[rel=stylesheet]'));

                await Promise.all([
                        ...scriptTags.map(scriptTag => loadScript($scope, scriptTag, label, nodeSrc, absoluteDirectory)),
                        ...cssTags.map(cssTag => loadCss($scope, cssTag, label, absoluteDirectory))
                ]);
                
                // ---------- DOM Append ----------
                const fragment = templateCache[nodeSrc].content.cloneNode(true); // copy it out of the cache
                node.innerHTML = '';
                node.append(fragment);
                Logger.templateUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), 'loaded');
                
                // ---------- Start Up Function ----------
                // if it exists, rummage around in the modules to find it
                if (init) {
                        const initModule = (templateModuleCache[nodeSrc] || []).find(module => module[init]);
                        if (!initModule) {
                                node.classList.add('broken');
                                return Logger.templateBroken && console.error('%c' + label, Logger.css.broken($scope.$depth), `template function '${init}' not found or not exported`);
                        }
                        
                        Logger.templateInvoke && console.debug('%c' + label, Logger.css.invoke($scope.$depth), init);
                        initModule[init].call(fragment, templateScope)
                }
                await interpolate(node, templateScope, absoluteDirectory);
                node.classList.remove('loading');
                
                return templateScope;
        }
        
        
        return await Promise.all(templateNodes.map(loadTemplate)).then(results => results);
}

// ---------- JS Loader ----------
// get the js and cache the load promises 
async function loadScript($scope, scriptTag, label, nodeSrc, absoluteDirectory) {
        let src = scriptTag.getAttribute('src');
        src = src.startsWith('/') ? src : absoluteDirectory + src; // adjust it if it's not absolute

        // load and wait if it's new
        if (!templateScriptCache[src]) {
                templateModuleCache[nodeSrc] = templateModuleCache[nodeSrc] ?? [];
                templateScriptCache[src] = import(src);
                await templateScriptCache[src];
                templateScriptCache[src].then(jsModule => {
                        templateModuleCache[nodeSrc].push(jsModule);
                        Logger.templateUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), src);
                });
        }
        
        // remove the original tag
        scriptTag.remove();
}

// ---------- CSS Loader ----------
// get the css and cache the load promises 
async function loadCss($scope, cssTag, label, absoluteDirectory) {
        let href = cssTag.getAttribute('href');
        href = href.startsWith('/') ? href : absoluteDirectory + href; // adjust it if it's not absolute

        if (!templateCssCache[href]) {
                templateCssCache[href] = import(href, { with: { type: 'css' } });
                await templateCssCache[href];
                templateCssCache[href].then(cssModule => {
                        document.adoptedStyleSheets.push(cssModule.default);
                        Logger.templateUpdate && console.debug('%c' + label, Logger.css.update($scope.$depth), href);
                });
        }
        
        // remove original tag
        cssTag.remove();
}

export function mvText(root, $scope) {
        // ---------- Text Nodes ----------
        for (const node of getTextNodes(root)){
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
        }
        

        // ---------- Attributes ----------
        for(const [node, attributes] of getNodeAttributesMap(root)){
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
        }
}


// generate all the next nodes that have {{}} syntax
function* getTextNodes(root) {
        const pattern = /{{.*}}/;
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, node =>
                node.nodeType === 1 && node.hasAttribute('mv-each')
                ? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
                : (
                        node.nodeType === 3 && pattern.exec(node.nodeValue)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP
                )
        );
        
        while(treeWalker.nextNode()) yield treeWalker.currentNode;
}


// generate all the nodes with attributes that have {{}} syntax
function* getNodeAttributesMap(root) {
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
                node.hasAttribute('mv-each')
                ? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
                : (
                        node.attributes.length
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP
                )
        );
        
        // check root node
        // important for things like <option mv-each="val in vals" value="{{$scope.val}}">{{$scope.val}}</option>
        do {
                const attributes = Array.from(treeWalker.currentNode.attributes).filter((attribute) => /{{.*}}/.exec(attribute.value)); // NOSONAR
                if (attributes.length) {
                        yield [treeWalker.currentNode, attributes];
                }
        } while (treeWalker.nextNode());
}

