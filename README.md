# &#x232C; Minimum Viable ![Current Version](https://img.shields.io/badge/version-1.0.5-green.svg)

Proxy-based Vanilla JS Framework

[@fzubko](https://www.github.com/fzubko)



## Features

- HTML Template / JS / CSS Imports
- Two-Way Binding ```{{}}``` Syntax
- SPA Routing



## TLDR / Show Me Code!!

Download JS
- [mv.min.js](https://github.com/fzubko/minimum-viable/blob/main/js/mv-1.0.5.min.js)

Run this

```js
import { mvStart } from './mv-1.0.5.min.js';

mvStart();
```

### And then...!?

Load a template...

```html
<main></main>
<div mv-template src="footer.html"></div>
```

### And then...!?

Add an exported init function...

```js
export function header($scope){
  console.debug('header started');
  $scope.title = 'Header Title';
}
```

```html
<div mv-template="header" src="header.html"></div>
```

### And then...!?

Display some stuff...

```html
<header>{{$scope.title}}</header>
```


### And then...!?

Add a page...

```js
import { mvStart } from './mv-1.0.5.min.js';

mvStart($scope => {
  $scope.addRouter()
    .when('/page1').load('/page-1.html');
});
```
```html
<a mv-href href="/page1">Page 1</a>
<main mv-page></main>
```

### And then...!?

Peruse the repository -
[https://github.com/fzubko/minimum-viable/tree/main/html/](https://github.com/fzubko/minimum-viable/tree/main/html/)

~~And then ...!?~~