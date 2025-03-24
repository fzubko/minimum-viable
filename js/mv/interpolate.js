import { mvEach } from './mv-each.js';
import { mvHref } from './mv-href.js';
import { mvEvent } from './mv-event.js';
import { mvText } from './mv-text.js';
import { mvTemplate } from './mv-template.js';
import { mvPage } from './mv-page.js';
import { mvBind } from './mv-bind.js';
import { mvIf } from './mv-if.js';

export async function interpolate(node, $scope, path = '/') {

	// these all stop walking the tree when they encounter an [mv-each]
	mvHref(node);
	mvEvent(node, $scope);
	mvText(node, $scope);	
	mvBind(node, $scope);

	// there will probably be drama with the order of this execution
	mvIf(node, $scope);

	// removes elements and process them within a separate $scope
	mvEach(node, $scope);

	
	await mvTemplate(node, $scope, path);

	// page will kick off its own interpolate
	mvPage(node, $scope, path);
}