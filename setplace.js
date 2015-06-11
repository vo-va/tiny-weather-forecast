"use strict";
(function() {
	var needed_span = document.querySelector('.yr-content-title h1 span');
	if (needed_span === null) {
		return;
	}
	var _a = document.createElement('a');

	_a.classList.add('yrfc-ext-my-place-link');
	_a.textContent = "← Set this as place for extension";
	needed_span.appendChild(_a);

	function save_my_place(){
		var url = document.URL;
		var last_slash = url.lastIndexOf('/') + 1;
		url = url.substr(0, last_slash);

		chrome.storage.sync.set({'my_place' : url });
	}
	_a.onclick = save_my_place;	
})();
