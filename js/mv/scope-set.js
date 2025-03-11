import { createScope } from './scope.js';
import { Logger } from './logger.js';

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