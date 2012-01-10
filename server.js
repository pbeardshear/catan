var connect = require('connect'),
	io = require('socket.io'),
	po = require('./player_objects.js'),
	go = require('./game.js'),
	model = require('./model.js');

var server = new model.Server(connect);
var socket = io.listen(server.master);
server.listen(1337, '192.168.1.112');

socket.sockets.on('connection', function (client) {
	server.addClient(client);
	
	var Commands = {
		host: function (o) {
			var game = server.newGame();
			client.emit('host', game ? game.host(server, client, o) : { success: false, reason: 'server full' });
		},
		join: function (o) {
			var game = server.findGame(o.game);
			client.emit('join', game ? game.join(server, client, o.user) : { success: false, reason: 'not exist' });
			// game ? game.join(server, client, o.user) : client.emit('join', { success: false, reason: 'not exist' });
		},
		list: function () {
			client.emit('list', { games: server.listGames() });
		},
		
		chat: function (o) {
			// TODO: Find the game that this client belongs to and broadcast there
			client.broadcast.emit('chat', o);
			client.emit('chat', o);
		},
		trade: function () { },
		tradeComplete: function () { },
		// Broadcast a state update to all players in this game
		update: function () { },
		startTurn: function () { },
		endTurn: function () { },
		
		disconnect: function () {
			server.removeClient(client.id);
		}
	};
	
	// Set up control
	for (var comm in Commands) {
		if (Commands.hasOwnProperty(comm)) {
			client.on(comm, Commands[comm]);
		}
	}
});

// DEBUG
// Create some test games
for (var i = 0; i < 3; i++) {
	var game = server.newGame();
}

// var socket = io.listen(server);
// socket.on('connection', function (client) {
	// console.log('connection established!');
	// client.emit('hello', { data: 'test' });
	// client.send({ data: 'test2' });
	// socket.emit('hello', { data: 'socket connection' });
	// var Commands = {
		// // Commands that you will allow the client to send up to the server
		// move: function (params) { 
			// socket.broadcast({ move: params });
		// },
		// hello: function (data) {
			// console.log('got here!');
			// console.log(data);
		// }
	// };
	
	// client.on('message', function (message) {
		// Object.keys(message).forEach(function (command) {
			// if (Commands.hasOwnProperty(command)) {
				// Commands[command](message[command]);b 
			// }
			// else {
				// console.error('Invalid command', command);
			// }
		// });
	// });
// })


