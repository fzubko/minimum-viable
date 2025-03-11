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