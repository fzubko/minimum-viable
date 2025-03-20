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