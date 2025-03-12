import { mvEach } from './mv-each.js';
import { mvHref } from './mv-href.js';
import { mvEvent } from './mv-event.js';
import { mvText } from './mv-text.js';
import { mvTemplate } from './mv-template.js';
import { mvPage } from './mv-page.js';
import { mvBind } from './mv-bind.js';
import { mvIf } from './mv-if.js';

export async function interpolate(node, $scope, path = '/') {
	// each has to happen before everything
	// it will remove elements and process them within a separate $scope
	mvEach(node, $scope);

	mvHref(node);
	mvEvent(node, $scope);
	mvText(node, $scope);	
	mvBind(node, $scope);
	mvIf(node, $scope); // there will probably be drama with the order of this execution
	
	await mvTemplate(node, $scope, path);

	// page will kick off its own interpolate
	mvPage(node, $scope, path);
}