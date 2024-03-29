//
//	controller.js
//

var Controller = (function () {
	var socket,
		bundles = { },
		activeBundle = null;
		
	var interceptor = (function () {
		// State variables --------------------------------------------------------------------------------
		// ------------------------------------------------------------------------------------------------
		var events = { };	// Dictionary of events, keyed on event name
		
		// Private methods --------------------------------------------------------------------------------
		// ------------------------------------------------------------------------------------------------
		function handler (e) {
			var action = events[e.data.type];
			if (action && action.active) {
				action.fn.call(this, e);
			}
		}
		
		// Public -----------------------------------------------------------------------------------------
		// ------------------------------------------------------------------------------------------------
		return {
			add: function (actions) {
				base.each(actions, function (o, name) {
					var e = { fn: (typeof o == 'object' ? o.fn : o), active: false };
					events[name] = e;
				});
			},
			bind: function (el, event, fn, name) {
				/*
				var e = events[name];
				var o = { fn: fn, active: ((e && e.active) || false) };
				events[name] = o;
				*/
				$(el).bind(event, { type: name }, handler);
			},
			activate: function (name) {
				events[name] && (events[name].active = true);
			},
			deactivate: function (name) {
				events[name] && (events[name].active = false);
			}
		};
	})();
	
	function Bundle (name, actions) {
		this.name = name;
		this.actions = actions;
		this.active = false;
	}
	
	Bundle.prototype.activate = function () {
		this.active = true;
		if (activeBundle) {
			activeBundle.deactivate();
		}
		activeBundle = this;
	};
	Bundle.prototype.deactivate = function () {
		this.active = false;
		activeBundle = null;
		// Deactivate all actions in this bundle
		base.each(this.actions, function (fn, name) {
			interceptor.deactivate(name);
		});
	};
	
	return {
		init: function (io, commands, autoLoad, actions) {
			// Check if we got socket.io from the server
			if (io) {
				socket = io.connect(app.CONST.IP);
				if (autoLoad && actions) {
					$('.action').each(function (i, el) {
						var classes = el.className.split(' ');
						for (var j = 0; j < classes.length; j++) {
							var o = actions[classes[j]];
							if (o) {
								interceptor.bind(el, o.event || 'click', o.fn || o, classes[j]);
							}
						}
					});
				}
				
				base.each(commands, function (fn, name) {
					socket.on(name, fn);
				});
			} else {
				alert("Sorry, it seems you weren't able to connect to the server.  Please refresh and try again.");
			}
		},
		on: function (name, el, event, fn, bundleName) {
			var _bundleName = bundleName.split(' ');
			base.each(_bundleName, function (bname) {
				var _bundle = bundles[bname];
				if (_bundle) {
					var action = {};
					action[name] = fn;
					interceptor.add(action);
					_bundle.actions[name] = fn;
				}
			});
			if (el.length) {
				base.each(el, function (dom) {
					interceptor.bind(dom, event, fn, name);
				});
			} else {
				interceptor.bind(el, event, fn, name);
			}
		},
		detect: function (name) {
			base.each(bundles, function (bundle) {
				base.each(bundle.actions, function (o, action) {
					if (action == name) {
						var selector = '.action.' + name;
						$(selector).each(function (i, el) {
							interceptor.bind(el, o.event || 'click', o.fn || o, name);
						});
					}
				});
			});
		},
		
		// Alias for websocket.emit
		// Sends message to server if it is active in the current bundle
		fire: function (name, options, fn) {
			if (activeBundle.actions[name]) {
				socket.emit(name, options, fn);
			}
		},
		
		// Unsafe alias for websocket.emit
		// To ensure that the action is active in the bundle, use Controller.fire instead
		emit: function (name, options, fn) {
			socket.emit(name, options, fn);
		},
		
		bundle: function (name, actions, active) {
			var _bundle = new Bundle(name, actions);
			interceptor.add(actions);
			if (active) {
				_bundle.activate();
			}
			bundles[name] = _bundle;
		},
		
		swapTo: function (to) {
			// Change the active bundle
			var _bundle = bundles[to];
			_bundle.activate();
		},
		
		request: function (name) {
			if (typeof name == 'object' && name.length) {
				var self = this;
				base.each(name, function (o) {
					self.request(o);
				});
				return;
			}
			// Only allow the request if the action is part of the active bundle
			if (activeBundle.actions[name]) {
				interceptor.activate(name);
				return true;
			}
			return false;
		},
		
		release: function (name) {
			if (typeof name == 'object' && name.length) {
				var self = this;
				base.each(name, function (o) {
					self.release(name);
				});
				return;
			}
			interceptor.deactivate(name);
		},
		
		// Send a state update request to the server
		update: function (data) {
			socket.emit('update', data);
		},
		
		// Binds the an event listener to all objects matching
		// the passed selector, then unbinds after the first execution
		bindOnce: function (selector, event, fn) {
			var handler = function (e) {
				// Returning false can cancel the unbinding, in case the user made a mistake
				var result = fn.call(this, e);
				if (result !== false) {
					$(selector).unbind(event, handler);
				}
			};
			$(selector).bind(event, handler);
		}
	};
})();