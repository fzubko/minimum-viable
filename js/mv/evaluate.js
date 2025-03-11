export function evaluate($scope, string) {
	let f = new Function('$scope', `'use strict'; ${string};`);
	f($scope, string);
}

export function evaluateAsBoolean($scope, string) {
	let f = new Function('$scope', `'use strict'; return !!(${string});`);
	return f($scope, string);
}

export function evaluateTemplateLiteral($scope, string) {
	let f = new Function('$scope', `'use strict'; return \`${string}\`;`);
	return f($scope, string);
}