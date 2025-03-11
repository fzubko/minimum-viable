import { mvStart } from './mv-1.0.0.min.js';

mvStart($scope => {
	// nav router
	$scope.addRouter()
		.when('/mv/showcase').load('/html/mv/showcase-nav.html');
	
	// main router
	$scope.addRouter()
		.when('/mv/showcase').load('/html/mv/showcase.html','showcase')
		.otherwise('/');
});