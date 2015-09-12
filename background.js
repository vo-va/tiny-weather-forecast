"use strict";
(function() {
var ext_core = {
	init : function() {
		this.my_place = "http://www.yr.no/place/Norway/Oslo/Oslo/Oslo/";
		this.place_name = 'Oslo';
		this.page_for_button = "hour_by_hour_detailed.html";
		this.forecast_page = "forecast_hour_by_hour.xml";
		this.main_interval = 900000; // 60 * 1000 * 15 minutes
		this.draw_timeout = 20000; // timout before ico changed 
		this.day = 86400000;
		this.alpha = 0;
		this.x = -1;
		this.direction = 1; // 1 - alpha ->1, 0 alpha -> 0;
		this.show_next = 0; // 1 - icon, 0 temperature;
		this.img_data;
		this.timeout_hndl;
		this.forecast_interval;
		this.temperature = undefined;
		this.new_temperature = undefined;
		this.last_modified = undefined;
		this.STORAGE_VAR_NAME = 'my_place';
		this.STORAGE_NAME = 'sync';
		this.font_name = 'futura';
		this.css_file_name = 'font.css'
		this.text_opts = {
			1 : [4.495, 0, '17.37px'],
			2 : [0, 0.448, '16.56px'],
			3 : [0, 2.55, '12.71px'],
			4 : [0, 4.48, '9.17px']
		};
		this.forecast_cache = {};

		this.canvas = document.createElement('canvas');
		this.canvas.width = 19;
		this.canvas.height = 19;
		this.context = this.canvas.getContext('2d');
		this.context.textBaseline = 'top';
		this.context.globalAlpha = this.alpha;
		this.buffer_image = new Image();
		this.waiting_queue = [];
		this.need_clean = false;
		this.tick_worker = new Worker('tick.js');
		this.need_update = false;
		this.animating_now = false;
	},
	set_worker_listner : function() {
		var ext_core_ptr = this;
		this.tick_worker.onmessage = function(event) {
			if (event.data === 'tick') {
				ext_core_ptr.fade();
			}
		};
	},
	set_icon_title : function() {
		chrome.browserAction.setTitle({'title': 'Current weather in ' + this.place_name + '. Open detailed weather forecast.'});
	},
	make_listen : function() {
		var key;
		var ext_core_ptr = this;
		chrome.storage.onChanged.addListener(function(changes, namespace) {
			for (key in changes) {
				if (key == ext_core_ptr.STORAGE_VAR_NAME && namespace == ext_core_ptr.STORAGE_NAME) {
					if (changes[key].newValue === ext_core_ptr.my_place) {
						return;
					}
					ext_core_ptr.need_clean = true;
					ext_core_ptr.my_place = changes[key].newValue;
					ext_core_ptr.last_modified = undefined;
					ext_core_ptr.get_url_resource(ext_core_ptr.my_place + ext_core_ptr.forecast_page, ext_core_ptr.response_handler)
				}
			}
		});
	},
	make_button : function() {
		var ext_core_ptr = this;
		chrome.browserAction.onClicked.addListener(function() {
			chrome.tabs.query({currentWindow: true, active: true}, function(tab) {
				chrome.tabs.create( { "url": ext_core_ptr.my_place + ext_core_ptr.page_for_button } );
			});
		});
	},
	perpare_font : function() {
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = this.css_file_name;
		document.getElementsByTagName('head')[0].appendChild(link);
		
		var doc = document.getElementsByTagName('body')[0];
		var par = document.createElement('p');
		par.textContent = ".";
		doc.appendChild(par);
		doc.appendChild(this.canvas);

	},
	load_cache : function(){
		if (this.fsm_state !== 'ready'){
			this.waiting_queue.push([this.load_cache, this]);
			return;
		}
		var _load_cache = function(items){
			if (items.forecast_cache === undefined){
				this.forecast_cache = {};
			} else {
				this.forecast_cache = JSON.parse(items.forecast_cache);
				this.place_name =  items.place_name !== undefined ? items.place_name : this.place_name;
			}
			window.setTimeout(this.next_from_queue.bind(this), 1);
		};

		this.fsm_state = 'busy';
		chrome.storage.local.get(['forecast_cache', 'place_name'] , _load_cache.bind(this));
	},
	get_my_place : function() {
		var ext_core_ptr = this;
		var _get_my_place = function(item) {
			if (item.my_place == undefined) {
				//open page to choose my_place
			} else {
				ext_core_ptr.my_place = item.my_place; 
			}
			window.setTimeout(ext_core_ptr.next_from_queue.bind(ext_core_ptr), 1);;
		}
		ext_core_ptr.fsm_state = 'busy';
		chrome.storage.sync.get(ext_core_ptr.STORAGE_VAR_NAME, _get_my_place);
	},
	update_last_modified_date : function(last_modified) {
		var tmp_date = new Date(last_modified);
		if (tmp_date.toString() === 'Invalid Date') {
			this.last_modified = undefined;
			return;
		}
		var now = new Date();
		var tzdiff = now.getTimezoneOffset();
		//convert to utc
		now = now.valueOf() + tzdiff * 60000;
		tmp_date = tmp_date.valueOf() + tzdiff * 60000;

		if ((tmp_date - now) > 0 ){
			// last modified header from future - imposible (we ignore timezones)
			this.last_modified = undefined;
			return;
		}

		if ((tmp_date - now) < 0) {
			this.last_modified = last_modified;
			return;
		}
	},
	response_handler : function(state, status, response, last_modified) {
		switch(state) {
		case 'ok':
			this.update_last_modified_date(last_modified);
			if (status === 304) { //not changed 
				return;
			}
			if (status === 200) {
				this.update_forecast_cache(response);
			}
		break;
		}
	},
	update_forecast_cache : function(response) {
		var normalize_symbol = function(symbol){
			//get rid of moon phase
			if (symbol.slice(0,2) === 'mf') {
				return symbol.replace('mf/','').slice(0,-3);
			}
			return symbol;
		}
		if (this.need_clean) {
			this.forecast_cache = {};
			this.need_clean = false;
		}
		var i;
		var len;
		var time_keys;
		var now = new Date();
		var tzdiff = now.getTimezoneOffset();
		now = now.valueOf() + tzdiff * 60000; // convert to utc

		time_keys = Object.keys(this.forecast_cache);

		for (i = 0, len = time_keys.length; i < len; i++) {
			if ((now - Number(time_keys[i])) > this.day) {
				delete this.forecast_cache[time_keys[i]];
			}
		}
		var place_name = response.querySelector('location name');
		this.place_name = place_name.innerHTML;
		var forecast_tzdiff = response.getElementsByTagName('timezone')[0].getAttribute('utcoffsetMinutes');
		forecast_tzdiff = (- Number(forecast_tzdiff));
		var forecast = response.getElementsByTagName('tabular')[0];
		forecast = forecast.getElementsByTagName('time');
		
		var forecast_len = forecast.length;
		var row;
		var time;
		var temperature;
		var symbol;
		for (i = 0; i < forecast_len; i++) {
			row = forecast[i]
			time = row.getAttribute('from');
			temperature = row.getElementsByTagName('temperature')[0].getAttribute('value');
			symbol = row.getElementsByTagName('symbol')[0].getAttribute('var');
			symbol = normalize_symbol(symbol);
			// time from xml file looks like "2015-01-01T00:00:00"
			// function Date(time) create new Date object as time + tzdiff
			// so to convert to utc time we have to subtract or add local computer tzdiff and then forecast_tzdiff
			// for example new Date("2015-01-01T00:00:00") in local tz + 4 create date object  Thu Jan 01 2015 04:00:00 GMT+0400
			// and if forecast for Oslo tz = +0200 we must substract -4 and - 2 to the final result Jan 31 2014 22:00:00 GMT+0000
			time = (new Date(time)).valueOf() + forecast_tzdiff * 60000;
			this.forecast_cache[time.toString()] = {'temperature': temperature, 'symbol' : symbol};
		}

		chrome.storage.local.set({'forecast_cache' : JSON.stringify(this.forecast_cache)});
		chrome.storage.local.set({'place_name' : this.place_name});
		window.setTimeout(this.get_forecast_for_now.bind(this), 1);

		if (this.loop_state === 'wait_for_forecast') {
			this.loop_state = 'ok';
			this.main_loop();
		}
	},

	get_url_resource: function(url, response_handler) {
		var request = new XMLHttpRequest();
		var last_modified_date;
		request.ext_core_pointer = this;

		request.onerror = function() {
			response_handler.call(request.ext_core_pointer, 'network error', this.status, this.response);
		};

		request.onload = function() {
			if (this.status >= 200 && this.status < 400){
				response_handler.call(request.ext_core_pointer, 'ok', this.status, this.responseXML, this.getResponseHeader('Last-Modified'));
			} else {
				response_handler.call(request.ext_core_pointer, 'error', this.status, this.response);
			}
		};
		request.open('GET', url, true);

		if (this.last_modified !== undefined){
			
			// request.setRequestHeader('If-Modified-Since', (new Date()).toUTCString());
			request.setRequestHeader('If-Modified-Since', this.last_modified);
		}

		request.send();
	},

	fetch_new_data : function() {
		this.get_url_resource(this.my_place + this.forecast_page, this.response_handler);
	},
	fade : function() {

		if (this.alpha >= 1 && this.direction === 1){
			this.clean_up();
			return;
		}
		if (this.alpha <= 0 && this.direction === 0){
			this.clean_up();
			return;
		}

		if (this.direction === 1) {
			this.x = this.x + 0.01;
		}
		else {
			this.x = this.x - 0.01;
		}

		this.alpha = - Math.pow(this.x, 2) + 1;
		this.context.globalAlpha = this.alpha;

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				
		if (this.show_next === 1) {
			this.context.drawImage(this.buffer_image, 0, 0, this.canvas.width, this.canvas.height);
		} else {
			this.context.fillText(this.temperature, this.text_opt[0], this.text_opt[1]);
		}

		this.img_data = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		chrome.browserAction.setIcon({ 'imageData' : this.img_data });
	},

	get_forecast_for_now : function() {
		if (this.fsm_state !== 'ready'){
			this.waiting_queue.push([this.get_forecast_for_now, this]);
			return;
		}
		this.fsm_state = 'busy';
		var now = new Date();
		var tzdiff = now.getTimezoneOffset();
		now = now.valueOf() + tzdiff * 60000;

		var weather_key = now;
		var all_keys = Object.keys(this.forecast_cache).map(Number).sort();

		// for different places around the world yr.no provide forecast with different interval
		// also you can't get forecast for past only for future
		// for example, if you in Oslo and your current time ins 11:30, yr.no provide information only for 12:00 not for 11:00
		// so we always take the nearest forecast for your current time 
		var i;
		var len;

		var diff1;
		var diff2;
		var sought_for_key;
		var forecast_for_now;

		for (i = 0, len = all_keys.length; i < len; i++){
			if (all_keys[i] >= weather_key) {
				sought_for_key = all_keys[i];
				break;
			}
		}

		if (sought_for_key === undefined){
			forecast_for_now = undefined;
		} else {
			if ( (i === 0) || (i === (len - 1) ) ) {
				forecast_for_now = this.forecast_cache[sought_for_key.toString()];
			} else {
				diff1 = sought_for_key - weather_key;
				diff2 = weather_key - all_keys[i - 1];

				if (diff1 === diff2 || diff1 < diff2 ) {
					forecast_for_now = this.forecast_cache[sought_for_key.toString()];
				} else {
					forecast_for_now = this.forecast_cache[all_keys[i - 1].toString()];
				}
			}
		}
	
		window.setTimeout(this.next_from_queue.bind(this), 1);			
		if (forecast_for_now === undefined) {
			this.temperature = 'n/a';
			this.loop_state = 'wait_for_forecast';

			this.get_url_resource(this.my_place + this.forecast_page, this.response_handler)
			return;
		} 

		this.next_temperature = forecast_for_now.temperature;
		this.next_symbol = ['svg/', forecast_for_now.symbol, '.svg'].join('');	

		if (this.temperature === undefined || this.buffer_image.src === undefined) {
			this.temperature = this.next_temperature;
			this.buffer_image.src = this.next_symbol;
			this.set_icon_title();
			return;
		}
		
		if (this.temperature !== this.next_temperature || this.buffer_image.src !== this.next_symbol) {
			this.need_update = true;
		}

		if (this.need_update && this.animating_now === false && this.direction === 0) {
			window.clearTimeout(this.timeout_hndl);
			this.timeout_hndl = window.setTimeout(this.main_loop.bind(this), 1);
		}
		return;
	},
	set_text_opts : function(){
		this.text_opt = this.text_opts[this.temperature.length];
		this.context.font = [this.text_opt[2], this.font_name].join(' ');
	},
	clean_up : function() {
		this.animating_now = false;
		this.tick_worker.postMessage('stop');
		var timeout = this.draw_timeout;
		clearInterval(this.timeout_hndl);
		if (this.direction === 1 && this.need_update) {
			timeout = 1;
		}

		if (this.direction === 0) {
			// if icon is invisble timeout = 1
			if (this.need_update) {
				this.temperature = this.next_temperature;
				this.buffer_image.src = this.next_symbol;
				this.set_icon_title();
				this.need_update = false;
			}
			
			timeout = 1;
			this.show_next = this.show_next ^ 1;
		}
		this.alpha = this.direction;
		this.swap();

		this.timeout_hndl = window.setTimeout(this.main_loop.bind(this), timeout);
	},
	swap: function() {
		this.direction = this.direction ^ 1;
	},
	show_fallback : function() {
		this.alpha = 1;
		this.direction = 0;
		this.x = 0;
		this.context.globalAlpha = this.alpha;
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillText(this.temperature, this.text_opt[0], this.text_opt[1]);
		this.img_data = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		chrome.browserAction.setIcon({ imageData: this.img_data });
		this.set_icon_title();
	},
	next_from_queue : function() {
		this.fsm_state = 'ready';
		if (this.waiting_queue.length > 0) {
			var fnc_ptr = this.waiting_queue.shift();
			fnc_ptr[0].call(this, fnc_ptr[1]);
		}
	},
	main_loop : function() {
		window.clearTimeout(this.timeout_hndl);

		if (this.fsm_state !== 'ready'){
			this.waiting_queue.push([this.main_loop, this]);
			return;
		}

		this.set_text_opts();
		window.setTimeout(this.next_from_queue.bind(this), 1);
		if (this.loop_state === 'wait_for_forecast') {
			this.show_fallback();
			return;
		}
		this.animating_now = true;
		this.tick_worker.postMessage('start');

	},
	
};
ext_core.init();
ext_core.set_worker_listner();
ext_core.perpare_font();
ext_core.get_my_place();
ext_core.make_listen();
ext_core.make_button();
ext_core.load_cache();
ext_core.get_forecast_for_now();
ext_core.timeout_hndl = window.setTimeout(ext_core.main_loop.bind(ext_core), 500); //small timeout to let font load
ext_core.forecast_interval = window.setInterval(ext_core.fetch_new_data.bind(ext_core), ext_core.main_interval);


})();
