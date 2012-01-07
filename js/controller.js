//
//	controller.js
//

var Controller = (function () {
	var socket;
	var Commands = {
		// Host a new game
		host: function () { },
		// Join an existing game
		join: function () { },
		// List available games
		list: function () { },
		// Send a chat message
		chat: function () { },
		// Start a new game
		start: function (s) {
			Game.init(s);
		},
		// Disconnect from the server
		disconnect: function () { }
	};
	
	// Allowable actions
	var Actions = {
		// Build a settlement, road, city, or development card
		build: {
			el: '#build .items .button',
			event: 'click',
			fn: function (e) {
				Game.place({ type: $(e).attr('value') });
			}
		},
		// Activate a development card
		useCard: {
			el: '#development .items .button',
			event: 'click',
			fn: function (e) {
				// Activate development card
			}
		},
		// Trade resources
		trade: {
			el: '#trade .button',
			event: 'click',
			fn: function (e) {
				// Popup trade menu
			}
		}
	};
	
	return {
		init: function (io) {
			socket = io.connect('192.168.1.112:1337');
			
			for (var comm in Commands) {
				if (Commands.hasOwnProperty(comm)) {
					socket.on(comm, Commands[comm]);
				}
			}
		},
		// Send the passed command up to the server, along with any optional passed data
		go: function (comm, o) {
			socket.emit(comm, o);
		},
		// Set allowable actions for this player
		activate: function (name) {
			var action = Actions[name];
			if (action) {
				$(action.el).bind(action.event, action.fn);
			}
		},
		// Remove actions allowed by the player
		deactivate: function (name) {
			var action = Action[name];
			if (action) {
				$(action.el).unbind(action.event);
			}
		}
	};
})();
