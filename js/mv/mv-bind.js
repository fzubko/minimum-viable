export function mvBind(root, $scope){
	// ---------- Form Bind ----------
	// add mv-bind to elements with names in the format form.name
	for (const form of getBindNodes(root, true)){
		const mvBindName = form.getAttribute('mv-bind');
		$scope[mvBindName] ??= {};
		
		for (const node of form.querySelectorAll(':scope :not([type=button], [type=image], [type=reset], [type=submit])[name]')){
			const name = node.getAttribute('name');
			$scope[mvBindName][name] ??= node.value;
			node.setAttribute('mv-bind', mvBindName + '.' + name);
		}
	}
	
	// ---------- Regular Bind ----------
	for (const node of getBindNodes(root, false)) {
		
		// ---------- Setup ----------
		// traverse from scope through . notation to almost last position to find the owner
		// its needed to attach change and unload events
		const $owner = node.getAttribute('mv-bind').split('.').slice(0, -1).reduce((obj, key) => obj[key], $scope);
		// get the lsat one
		const mvBindName = node.getAttribute('mv-bind').split('.').pop();
		// set multi-prefix if it supports multiple
		// inputs use the type attribute or text
		// everything else is the tag name
		const type = (node.hasAttribute('multiple') ? 'multi-' : '')
			+ (node.tagName === 'INPUT' ? node.type || 'text' : node.tagName);
		
		// ---------- Listener + Onchange ----------
		// get the functions based on the node type
		let inputListener;
		let onchange;
		switch (type.toLowerCase()){
			// ---------- Input Type = Date/Week/Month/Time ----------
			case 'date': 
			case 'week': 
			case 'month':
			case 'time': {
				inputListener = () => {
					if ((node.value || null) == null) {
						$owner[mvBindName] = null;
						return;
					}
					$owner[mvBindName] = node.valueAsDate;
				}
				
				onchange = newDate => {
					if (newDate) {
						// can't set it directly since newDate is Date wrapped in a Proxy
						node.valueAsDate = new Date(newDate.getTime());
					} else {
						node.value = null;
					}
				}
				break;
			}

			// ---------- Input Type = Datetime-Local ----------
			case 'datetime-local': {
				inputListener = () => { // yyyy-mm-ddThh:mi:ss.f to Date object
					if ((node.value || null) == null) {
						$owner[mvBindName] = null;
						return;
					}
					// split by - T : and .
					const values = node.value.split(/[-T:.]/);
					values[1] = values[1] - 1; // zero-based month adjustment
					if (values.length > 6)
						values[6] = values[6].padEnd(3, '0'); // hundreths padding
					$owner[mvBindName] = getNewUtcDate(...values);
				}
				
				onchange = () => { // Date object to yyyy-mm-ddThh:mi:ss.fff, a little different than above, give more f's
					if ($owner[mvBindName]) {
						const d = new Date($owner[mvBindName].getTime());
						node.value =
								d.getUTCFullYear() + '-' +
								(d.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
								d.getUTCDate().toString().padStart(2, '0') + 'T' +
								d.getUTCHours().toString().padStart(2, '0') + ':' +
								d.getUTCMinutes().toString().padStart(2, '0') + ':' +
								d.getUTCSeconds().toString().padStart(2, '0') + '.' +
								d.getUTCMilliseconds().toString().padStart(3, '0');
					} else {
						node.value = null;
					}
				}
				break;
			}

			// ---------- Input Type = Radio ----------
			case 'radio': {
				$owner[mvBindName] ??= node.value;
				
				inputListener = () => {
					$owner[mvBindName] = node.value;
				}

				onchange = () => {
					node.checked = node.value == $owner[mvBindName];
				}
				break;
			}
			
			// ---------- Input Type = Checkbox ----------
			case 'checkbox': {
				$owner[mvBindName] ??= node.checked;
				
				inputListener = () => {
					$owner[mvBindName] = node.checked;
				}
				
				onchange = () => {
					node.checked = !!$owner[mvBindName];
				}
				break;
			}

			// ---------- Input Type = File ----------
			case 'file':
			case 'multi-file': {
				$owner[mvBindName] = node.files;
				inputListener = () => {
					$owner[mvBindName] = node.files; // this is the thing you'd append to a new FormData() and send
				}
				break;
			}

			// ---------- Select Multiple ----------
			case 'multi-select': {
				$owner[mvBindName] ??= [];
				
				inputListener = () => {
					// determine at runtime - if all select options are numbers
					const optionsAreNumbers = Array.from(node.options).every(option => numberPattern.exec(option.value));
					const selectedValuesSet = new Set();
					
					// add the selected values
					for (const option of node.selectedOptions) {
						selectedValuesSet.add(optionsAreNumbers ? Number(option.value) : option.value);
					}
					
					// bind check
					for (let i = $owner[mvBindName].length; i--;) {
						const value = $owner[mvBindName][i];
						if (selectedValuesSet.has(value)) {
							selectedValuesSet.delete(value); // already there, ignore
						} else {
							$owner[mvBindName].splice(i, 1); // not selected, remove it
						}
					}
					
					// add the others that weren't found
					selectedValuesSet.forEach(value => $owner[mvBindName].push(value));
					
					// order the bind array based on the selected options array
					const selectedValuesArray = Array.from(node.selectedOptions).map(option => option.value);
					$owner[mvBindName].sort((a, b) => {
						const aIndex = selectedValuesArray.indexOf(a.toString());
						const bIndex = selectedValuesArray.indexOf(b.toString());
						return aIndex.toString().localeCompare(bIndex, void 0, { numeric: true });
					});
				}
				
				
				onchange = () => {
					// determine at runtime - if all select options are numbers
					const optionsAreNumbers = Array.from(node.options).every(option => numberPattern.exec(option.value));
					const valuesSet = new Set($owner[mvBindName]);
					
					// option.selected = it exists in bind set
					for (const option of node.options) {
						option.selected = valuesSet.has(optionsAreNumbers ? Number(option.value) : option.value);
					}
				}
				break;
			}


			// ---------- Basic Number Type ----------
			case 'number':
			case 'range': {
				$owner[mvBindName] ??= node.valueAsNumber;
				
				inputListener = () => {
					$owner[mvBindName] = node.valueAsNumber
				}
				onchange = () => {
					node.value = $owner[mvBindName]
				}
				break;
			}
			
			// ---------- Basic String Type ----------
			case 'color':
			case 'email':
			case 'hidden':
			case 'password':
			case 'search':
			case 'select':
			case 'tel':
			case 'text':
			case 'textarea':
			case 'url': {
				$owner[mvBindName] ??= node.value;
				
				inputListener = () => {
					$owner[mvBindName] = node.value
				}
				onchange = () => {
					node.value = $owner[mvBindName]
				}
				break;
			}

			// ---------- Unsupported ----------
			default: {
				console.error('Unsupported mv-bind', node);
			}
		}
		
		node.addEventListener('input', inputListener);
		$scope.whenUnload.then(() => node.removeEventListener('input', inputListener));
		
		// file inputs don't have onchange, make sure it exists first
		if (onchange) {
			onchange($owner[mvBindName]);
			$owner.on('change', mvBindName, onchange);
		}
		
		if (type.toLowerCase() === 'multi-select') {
			['unshift','push','shift','pop','splice','copyWithin','fill'].forEach(method => {
				$owner[mvBindName].on(method, onchange);
			});
			$owner[mvBindName].on('change', 'length', onchange);
		}
	}
}

const numberPattern = new RegExp(/^(-?(0|[1-9]\d*)(\.\d+)?|\.\d+)$/);

function* getBindNodes(root, isForm) {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, node =>
		node.hasAttribute('mv-each')
		? NodeFilter.FILTER_REJECT // stop walking, all children will be ignored
		: (
			node.nodeName === 'FORM' === isForm && node.hasAttribute('mv-bind')
			? NodeFilter.FILTER_ACCEPT
			: NodeFilter.FILTER_SKIP
		)
	)
	
	while(treeWalker.nextNode()) yield treeWalker.currentNode;
}