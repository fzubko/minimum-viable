import { Logger } from './logger.js';
import { mvTemplate } from './mv-template.js';

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