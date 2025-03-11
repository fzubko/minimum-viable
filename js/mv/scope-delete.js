import { Logger } from './logger.js';

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