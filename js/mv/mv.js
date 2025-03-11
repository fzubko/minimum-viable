import { createScope } from './scope.js';
import { interpolate } from './interpolate.js';

export { Logger } from './logger.js';

export function mvStart(init){
	
	const $rootScope = createScope(null, Object.defineProperties({}, {
		$familyTree: { value: () => {
			let depth = 1;
			function walk(obj){
				console.debug(depth, obj)
				depth++;
				obj.$children.forEach(walk);
				depth--;
			}
			walk($rootScope);
		}}
	}), '$rootScope');
	
	const onLoad = () => {
		const html = document.getElementsByTagName('html')[0];
		html.classList.add('loading');
		interpolate(html, $rootScope).then(() => html.classList.remove('loading'));
		removeEventListener('load', onLoad);
	};
	addEventListener('load', onLoad);

	if (init) init($rootScope);
}