import { Logger } from './logger.js';
import { createScope } from './scope.js';
import { interpolate } from './interpolate.js';

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
		const nodeSrc = node.getAttribute('src'); // html fragment location
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

		// ---------- Directory Config ----------
		// derive the directory of the html
		// if src is absolute, ignore the path parameter, otherwise use it as a prefix
		const absoluteDirectory = (nodeSrc.startsWith('/') ? '' : path) + nodeSrc.split('/').slice(0, -1).map(d => d + '/').join('');
		
		// ---------- Template Fetch ----------
		if (!templatePromiseCache[path + nodeSrc]) {
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
