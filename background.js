"use strict";
(function() {
var ext_core = {
	init : function() {
		this.location_api_url = "https://www.yr.no/api/v0/locations" // "https://www.yr.no/api/v0/locations/1-72837?language=en"
		this.location_forecast_api_url = "https://api.met.no/weatherapi/locationforecast/2.0/complete" // "https://api.met.no/weatherapi/locationforecast/2.0/complete?altitude=192&lat=52.54707&lon=62.49987"
		this.my_place = "https://www.yr.no/place/Norway/Oslo/Oslo/Oslo";
		this.place_name = 'Oslo';
		this.place_id = '1-72837'; // Oslo id just a default value
		this.place_info = {};
		this.page_for_button = "";

		this.forecast_page = "/forecast_hour_by_hour.xml";
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
		this.forecast_last_check = undefined;
		this.temperature = undefined;

		// space in chrome bar is limited so displaying in it rounded temperatrue value to save space
		this.temperature_rounded = undefined;
		this.time_forecast = undefined;
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
		this.new_forecast_cache = {};

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
		this.old_new_map = {
			'clearsky': {
				'code': '1',
				'title': 'Clear sky',
			},
			'cloudy': {
				'code': '4',
				'title': 'Cloudy',
			},
			'fair': {
				'code': '2',
				'title': 'Fair',
			},
			'fog': {
				'code': '15',
				'title': 'Fog',
			},
			'heavyrain': {
				'code': '10',
				'title': 'Heavy rain',
			},
			'heavyrainandthunder': {
				'code': '11',
				'title': 'Heavy rain and thunder',
			},
			'heavyrainshowers': {
				'code': '41',
				'title': 'Heavy rain showers',
			},
			'heavyrainshowersandthunder': {
				'code': '25',
				'title': 'Heavy rain showers and thunder',
			},
			'heavysleet': {
				'code': '48',
				'title': 'Heavy sleet',
			},
			'heavysleetandthunder': {
				'code': '32',
				'title': 'Heavy sleet and thunder',
			},
			'heavysleetshowers': {
				'code': '43',
				'title': 'Heavy sleet showers',
			},
			'heavysleetshowersandthunder': {
				'code': '27',
				'title': 'Heavy sleet showers and thunder',
			},
			'heavysnow': {
				'code': '50',
				'title': 'Heavy snow',
			},
			'heavysnowandthunder': {
				'code': '34',
				'title': 'Heavy snow and thunder',
			},
			'heavysnowshowers': {
				'code': '45',
				'title': 'Heavy snow showers',
			},
			'heavysnowshowersandthunder': {
				'code': '29',
				'title': 'Heavy snow showers and thunder',
			},
			'lightrain': {
				'code': '46',
				'title': 'Light rain',
			},
			'lightrainandthunder': {
				'code': '30',
				'title': 'Light rain and thunder',
			},
			'lightrainshowers': {
				'code': '40',
				'title': 'Light rain showers',
			},
			'lightrainshowersandthunder': {
				'code': '24',
				'title': 'Light rain showers and thunder',
			},
			'lightsleet': {
				'code': '47',
				'title': 'Light sleet',
			},
			'lightsleetandthunder': {
				'code': '31',
				'title': 'Light sleet and thunder',
			},
			'lightsleetshowers': {
				'code': '42',
				'title': 'Light sleet showers',
			},
			'lightsnow': {
				'code': '49',
				'title': 'Light snow',
			},
			'lightsnowandthunder': {
				'code': '33',
				'title': 'Light snow and thunder',
			},
			'lightsnowshowers': {
				'code': '44',
				'title': 'Light snow showers',
			},
			'lightssleetshowersandthunder': {
				'code': '26',
				'title': 'Light sleet showers and thunder',
			},
			'lightssnowshowersandthunder': {
				'code': '28',
				'title': 'Light snow showers and thunder',
			},
			'partlycloudy': {
				'code': '3',
				'title': 'Partly cloudy',
			},
			'rain': {
				'code': '9',
				'title': 'Rain',
			},
			'rainandthunder': {
				'code': '22',
				'title': 'Rain and thunder',
			},
			'rainshowers': {
				'code': '5',
				'title': 'Rain showers',
			},
			'rainshowersandthunder': {
				'code': '6',
				'title': 'Rain showers and thunder',
			},
			'sleet': {
				'code': '12',
				'title': 'Sleet',
			},
			'sleetandthunder': {
				'code': '23',
				'title': 'Sleet and thunder',
			},
			'sleetshowers': {
				'code': '7',
				'title': 'Sleet showers',
			},
			'sleetshowersandthunder': {
				'code': '20',
				'title': 'Sleet showers and thunder',
			},
			'snow': {
				'code': '13',
				'title': 'Snow',
			},
			'snowandthunder': {
				'code': '14',
				'title': 'Snow and thunder',
			},
			'snowshowers': {
				'code': '8',
				'title': 'Snow showers',
			},
			'snowshowersandthunder': {
				'code': '21',
				'title': 'Snow showers and thunder',
			}
		};
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
		var text_temperature = this.temperature >= 0 ? '+' + this.temperature : this.temperature;
		chrome.browserAction.setTitle({'title': 'Current weather in ' + this.place_info.name + ': ' + text_temperature + '.\nClick to open detailed weather forecast.'});
	},
	convert_new_link_to_old(new_link) {
		return new_link.replace('/en/forecast/daily-table/', '/').replace(/\d+-\d+/, 'place');
	},
	get_place_id(original_url) {
		var place_regex = /(\d+-\d+)/g;
		var place_ids = original_url.match(place_regex);
		if (place_ids === null) { console.log('was not able to get place id')}
		return place_ids[0]
	},
	get_my_place() {
		var ext_core_ptr = this;
		var _get_my_place = function(item) {
			if (item.my_place == undefined) {
				//open page to choose my_place
			} else {
				
				ext_core_ptr.my_place = item.my_place;
				ext_core_ptr.place_id = ext_core_ptr.get_place_id(item.my_place);
				ext_core_ptr.get_location_by_place_id(ext_core_ptr.place_id, ext_core_ptr.response_handler_new);

			}
			window.setTimeout(ext_core_ptr.next_from_queue.bind(ext_core_ptr), 1);;
		}
		ext_core_ptr.fsm_state = 'busy';
		chrome.storage.sync.get(ext_core_ptr.STORAGE_VAR_NAME, _get_my_place);
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
					ext_core_ptr.place_id = ext_core_ptr.get_place_id(changes[key].newValue);
					ext_core_ptr.my_place = changes[key].newValue;
				    ext_core_ptr.get_location_by_place_id(ext_core_ptr.place_id, ext_core_ptr.response_handler_new);
				    // ext_core_ptr.forecast_cache = {};
					
					
					ext_core_ptr.last_modified = undefined;
					// ext_core_ptr.get_url_resource(ext_core_ptr.my_place + ext_core_ptr.forecast_page, ext_core_ptr.response_handler)
					// ext_core_ptr.get_location_forecast(ext_core_ptr.response_handler_weather_new)
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
	get_location_by_place_id(place_id, response_handler_new) {
		var request = new XMLHttpRequest();
		var last_modified_date;
		request.ext_core_pointer = this;

		request.onerror = function() {
			response_handler_new.call(request.ext_core_pointer, 'network error', this.status, this.response);
		};

		request.onload = function() {
			if (this.status >= 200 && this.status < 400){
				response_handler_new.call(request.ext_core_pointer, 'ok', this.status, this.response, this.getResponseHeader('expires'));
			} else {
				response_handler_new.call(request.ext_core_pointer, 'error', this.status, this.response);
			}
		};

		request.open('GET', `${this.location_api_url}/${this.place_id}?language=en`, true);

		request.send();

	},
	get_location_forecast(response_handler_weather_new) {

		if (!('position' in this.place_info)) {
			window.setTimeout(this.get_location_forecast.bind(this, response_handler_weather_new), 1000);
			return;
		}


		var request = new XMLHttpRequest();
		var last_modified_date;
		request.ext_core_pointer = this;

		request.onerror = function() {
			response_handler_weather_new.call(request.ext_core_pointer, 'network error', this.status, this.response);
		};

		request.onload = function() {
			if (this.status >= 200 && this.status < 400){
				response_handler_weather_new.call(request.ext_core_pointer, 'ok', this.status, this.response, this.getResponseHeader('expires'));
			} else {
				response_handler_weather_new.call(request.ext_core_pointer, 'error', this.status, this.response);
			}
		};

		request.open('GET', `${this.location_forecast_api_url}?altitude=${this.place_info.elevation}&lat=${this.place_info.position.lat}&lon=${this.place_info.position.lon}`, true);

		request.send();

	},
	response_handler_new: function(state, status, response, expires) {
		switch(state) {
		case 'ok':
			if (status === 304) { //not changed
				return;
			}
			if (status === 200) {
				this.update_place_info(response);
			}
		break;
		}
	},
	response_handler_weather_new: function(state, status, response, expires) {
		switch(state) {
		case 'ok':
			if (status === 304) { //not changed
				return;
			}
			if (status === 200) {
				this.update_forecast_cache_new(response);
			}
		break;
		}
	},
	update_place_info: function(response){
		this.place_info = JSON.parse(response);
		this.get_location_forecast(this.response_handler_weather_new)
    	
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
			if (items.forecast_cache === undefined || items.place_name !== this.place_name){
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
	get_old_symbol: function(symbol_code){

		var parts = symbol_code.split('_')
		var code = this.old_new_map[parts[0]].code;

		code = code.padStart(2, '0')

		if (code === undefined) {
			console.log('Not expected symbol_code', symbol_code)
		}

		var time_of_day_code = ''
		if (parts.length > 1) {
			// taking first chartcert usually it will be d (day) or n (night)
			time_of_day_code = parts[1][0]
		}
		return code + time_of_day_code
	},


	update_forecast_cache_new : function(response) {
		var timeseries = JSON.parse(response).properties.timeseries;
		this.forecast_cache = {};

		for (var i = 0, len =timeseries.length; i< len; i++) {
			var item = timeseries[i];
			var datetime = new Date(item.time);
			var temperature = item.data.instant.details.air_temperature;

			
			// forecast in the next few days might have data for bigger time intervals
			// if forecast per hour not available, checking 6 hours
			var source_of_symbol = ['next_1_hours', 'next_6_hours']


			var symbol = null
			
			for (var source of source_of_symbol) {
				if (!(source in item.data)){
					continue
				}
				symbol = item.data[source].summary.symbol_code
				break
			}

			// if symbol not found in 1 hour and 6 hour forecast, stop creating cache
			if (symbol == null) {
				break
			}


			this.forecast_cache[datetime.valueOf()] = {
				"temperature": temperature,
				"original_time": item.time,
				"symbol": this.get_old_symbol(symbol)
			}
		}

		chrome.storage.local.set({'forecast_cache' : JSON.stringify(this.forecast_cache)});
		chrome.storage.local.set({'place_name' : this.place_info.name});

		window.setTimeout(this.get_forecast_for_now.bind(this), 1);

		if (this.loop_state === 'wait_for_forecast') {
			this.loop_state = 'ok';
			this.main_loop();
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
		var original_time;
		var temperature;
		var symbol;
		for (i = 0; i < forecast_len; i++) {
			row = forecast[i]
			original_time = row.getAttribute('from');
			temperature = row.getElementsByTagName('temperature')[0].getAttribute('value');
			symbol = row.getElementsByTagName('symbol')[0].getAttribute('var');
			symbol = normalize_symbol(symbol);
			// time from xml file looks like "2015-01-01T00:00:00"
			// function Date(time) create new Date object as time + tzdiff
			// so to convert to utc time we have to subtract or add local computer tzdiff and then forecast_tzdiff
			// for example new Date("2015-01-01T00:00:00") in local tz + 4 create date object  Thu Jan 01 2015 04:00:00 GMT+0400
			// and if forecast for Oslo tz = +0200 we must substract -4 and - 2 to the final result Jan 31 2014 22:00:00 GMT+0000
			time = (new Date(original_time)).valueOf() + forecast_tzdiff * 60000;
			this.forecast_cache[time.toString()] = {'temperature': temperature, 'symbol' : symbol, 'original_time': original_time };
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
		// this.get_url_resource(this.my_place + this.forecast_page, this.response_handler);
		this.get_location_forecast(this.response_handler_weather_new)
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
			this.context.fillText(this.temperature_rounded, this.text_opt[0], this.text_opt[1]);
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
		this.forecast_last_check = now;
		var tzdiff = now.getTimezoneOffset();
		now = now.valueOf();

		var weather_key = now + tzdiff * 60000;
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
				this.time_forecast = new Date(sought_for_key);
				forecast_for_now = this.forecast_cache[sought_for_key.toString()];
			} else {
				diff1 = sought_for_key - weather_key;
				diff2 = weather_key - all_keys[i - 1];

				if (diff1 === diff2 || diff1 < diff2 ) {
					this.time_forecast = new Date(sought_for_key);
					forecast_for_now = this.forecast_cache[sought_for_key.toString()];
				} else {
					forecast_for_now = this.forecast_cache[all_keys[i - 1].toString()];
					this.time_forecast = new Date(all_keys[i - 1]);
				}
			}
		}

		window.setTimeout(this.next_from_queue.bind(this), 1);
		if (forecast_for_now === undefined) {
			this.temperature = 'n/a';
			this.temperature_rounded = 'n/a';
			this.loop_state = 'wait_for_forecast';

			// this.get_url_resource(this.my_place + this.forecast_page, this.response_handler)
			this.get_location_forecast(this.response_handler_weather_new)
			return;
		}

		this.next_temperature = forecast_for_now.temperature;
		this.next_symbol = ['svg/', forecast_for_now.symbol, '.svg'].join('');

		if (this.temperature === undefined || this.buffer_image.src === undefined) {
			this.temperature = this.next_temperature;
			this.temperature_rounded = Math.round(this.next_temperature);
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
		this.text_opt = this.text_opts[String(this.temperature_rounded).length];
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
				this.temperature_rounded = Math.round(this.next_temperature);
				this.set_icon_title();
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
		this.context.fillText(this.temperature_rounded, this.text_opt[0], this.text_opt[1]);
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

		var now = new Date();
		var time_diff = now - this.forecast_last_check;
		if ( time_diff > this.main_interval || time_diff < 0) {
			window.setTimeout(this.get_forecast_for_now.bind(this), 1);
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
