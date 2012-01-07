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
		}
	};
})();
