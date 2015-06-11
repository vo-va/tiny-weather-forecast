"use strict";
(function(){
var interval_id;
function send_tick(){
	postMessage('tick');
}
var state = 'stoped';

onmessage = function(event) {
	switch(event.data) {
	case 'start':
		if (state !== 'running') {
			interval_id = setInterval(send_tick, 45);				
			state = 'running';
		}
	break;
	case 'stop':
		clearInterval(interval_id);
		state = 'stoped';
	break;
	}
};
})();