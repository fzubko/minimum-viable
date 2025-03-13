import { createScope } from './scope.js';
import { interpolate } from './interpolate.js';

export { Logger } from './logger.js';

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