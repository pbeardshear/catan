var connect = require('connect'),
	io = require('socket.io'),
	po = require('./player_objects.js'),
	go = require('./game.js'),
	model = require('./model.js');

var server = new model.Server(connect);
var socket = io.listen(server.master);
server.listen(1337, 'localhost');

socket.sockets.on('connection', function (client) {
	// Add the client to the server list
	server.addClient(client);
	
	// Define actions that the client is allowed to make
	var Commands = {
		host: function (o) {
			client.emit('host', server.newGame(client, o));
		},
		join: function (o) {
			var game = server.findGame(o.game),
				join = game ? game.join(client, o.username, false) : { success: false, reason: 'not exist' };
			client.emit('join', join);
			if (join.success) {
				client.broadcast.emit('newPlayer', { id: join.id, name: join.name });
				// Request the board data from the host and send it up to the newly joined client
				game.HOST.self.emit('request', { data: 'board' }, function (board) {
					client.emit('update', { type: 'board', data: board });
				});
			}
		},
		list: function () {
			client.emit('list', { games: server.listGames() });
		},
		chat: function (o) {
			// TODO: Find the game that this client belongs to and broadcast there
			client.broadcast.emit('chat', o);
			client.emit('chat', o);
		},
		pregame: function () {
			console.log('sent a pregame command');
			server.clients[client.id].game.initPlacement();
		},
		start: function () {
			console.log('sent a start command');
			server.clients[client.id].game.start();
		},
		trade: function () { },
		tradeComplete: function () { },
		// Broadcast a state update to all players in this game
		update: function (o) {
			o.dest == 'client' ? server.clients[client.id].game.broadcast('update', o, client) : client.game.update(o);
		},
		startTurn: function () { },
		endTurn: function () {
			// Iterate over each player in the game, and ask if they want to build anything
			var game = server.clients[client.id].game,
				current = game.currentTurn,
				players = game.numPlayers,
				result = game.endTurn();
			game.broadcast(server, result.message, result);
		},
		draw: function (o, fn) {
			var game = client.game,
				card = game.drawCard();
			// Alert all the players that this client got a new development card
			client.game.broadcast('update', {
				type: 'display',
				id: game.players[client.id].id,
				item: 'cards',
				amount: 1
			});
			fn(card);
		},
		
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
	// var game = server.newGame();
}



