import { mvStart } from './mv/mv.js';

mvStart($scope => {
	// nav router
	$scope.addRouter()
		.when('/mv/showcase').load('html/mv/showcase-nav.html');
	
	// main router
	$scope.addRouter()
		.when('/mv/showcase').load('html/mv/showcase.html','showcase')
		.otherwise('/');
});