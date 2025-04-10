export function showcase($scope){
	
	// ---------- Text 1 ----------
	$scope.getHash = () => document.location.hash;
	

	// ---------- Text 2 ----------
	
	const hashListener = () => {
		$scope.hash = document.location.hash;
	};
	addEventListener('popstate', hashListener);
	hashListener();
	
	$scope.whenUnload.then(() => {
		removeEventListener('popstate', hashListener);
	});
	

	// ---------- Text 3 ----------
	
	const opacityClassList = [
		'loading', 'opacity-75', 'opacity-50',
		'opacity-25', 'opacity-50', 'opacity-75'
	];
	const opacityIntervalId = setInterval(() => {
		$scope.textClass = opacityClassList.shift();
		opacityClassList.push($scope.textClass);
	}, 750);

	$scope.whenUnload.then(() => {
		clearInterval(opacityIntervalId);
	});
	
	$scope.opacityStop = () => clearInterval(opacityIntervalId);
	
	// ---------- Event ----------
	
	Object.assign($scope, {
		page: 1,
		prev: () => $scope.page = Math.max(1, $scope.page - 1),
		next: () => $scope.page = Math.min(9, $scope.page + 1)
	});
	
	$scope.on('change', 'page', pageValue => {
		console.debug('Page Change', pageValue);
	});
	
	// ---------- Array ----------
	$scope.arr = [];
	for (let i = 1; i <= 12; i++) {
		$scope.arr.push(i);
	}
	
	// ---------- Inputs ----------
	
	$scope.d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
	
	const select = document.getElementById('showcase-range');
	document.querySelectorAll('#showcase-range-list option').forEach(node => {
		const onclick = () => {
			select.value = node.value;
			select.dispatchEvent(new Event('input', {bubbles: false}));
		}
		node.addEventListener('click', onclick);
		$scope.whenUnload.then(() => node.removeEventListener('click', onclick));
	});
	
	// ---------- Data Table ----------
	
	class Project {
		constructor(obj) {
			Object.assign(this, obj);
		}
		sum() {
			return this.mo + this.tu + this.we + this.th + this.fr;
		}
	}
	
	$scope.timecards = [
		new Project({ project: 'mv-bind', mo: 4, tu: 2, we: 3, th: 2, fr: 6, show: true }),
		new Project({ project: 'mv-each', mo: 1, tu: 4, we: 3, th: 5, fr: 1, show: true }),
		new Project({ project: 'mv-page', mo: 3, tu: 0, we: 0, th: 1, fr: 0, show: true }),
		new Project({ project: 'mv-text', mo: 0, tu: 2, we: 2, th: 0, fr: 1, show: true }),
		new Project({ project: 'hide me', mo: 0, tu: 0, we: 0, th: 0, fr: 0, show: false })
	];
	$scope.timecardTotal = dow => $scope.timecards.reduce((acc, cur) => acc + cur[dow], 0);
	$scope.timecardsSum = () => $scope.timecards.reduce((acc, cur) => acc + cur.sum(), 0);
	$scope.addProject = (project) => $scope.timecards.push(new Project({ project, mo: 0, tu: 0, we: 0, th: 0, fr: 0, show: true }));
	
	// ---------- Bench Test ----------
	
	const delayStep = 10;
	let delay = 0;
	
	function then(f){
		setTimeout(f, delay);
		delay += delayStep;
	}
	then(() => $scope.arr.copyWithin(0, 6));
	then(() => $scope.arr.sort((a,b) => a < b ? -1 : a > b ? 1 : 0));
	then(() => $scope.arr.reverse());
	then(() => $scope.arr.shift());
	then(() => $scope.arr.pop());
	then(() => $scope.arr.sort());
	then(() => $scope.arr.shift());
	then(() => $scope.arr.pop());
	then(() => $scope.arr.fill(6, 1, 2));
	then(() => $scope.arr.length = 10);
	then(() => $scope.arr.splice(6, 4, 1, 2, 3, 4, 5, 9));
	then(() => $scope.arr.sort((a,b) => a < b ? -1 : a > b ? 1 : 0));
	then(() => console.assert(JSON.stringify($scope.arr) === '[1,2,3,4,5,6,7,8,9,10,11,12]'));
}