var connect = require('connect'),
	io = require('socket.io'),
	po = require('./player_objects.js'),
	go = require('./game.js'),
	model = require('./model.js');

var server = new model.Server(connect);
var base = io.listen(server.master);
server.listen(1337, 'localhost');

base.sockets.on('connection', function (client) {
	server.register('client', client);
	
	// Define actions that the client is allowed to make
	/*
	var Commands = {
		host: function (o) {
			var result = server.newGame(client, o);
			client.emit('host', result);
			if (result.success) {
				client.emit('setup', { success: true });
			}
		},
		join: function (o) {
			var game = server.findGame(o.game),
				join = game ? game.join(client, o.username, false) : { success: false, reason: 'not exist' };
			client.emit('join', join);
			if (join.success) {
				var players = game.getPlayers();
				client.emit('setup');
				client.emit('addPlayers', { count: players.length, players: players });
				client.broadcast.emit('addPlayers', { count: 1, players: [{ id: join.id, name: join.name, color: join.color }] });
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
	*/
	
	var Commands = {
		// Required data: game => name of game, username => username, players => max number of players
		host: function (data) {
			if (server.open()) {
				var game = new model.Game(server);
				var resp = game.host(client, data);
				resp.success ? server.register('game', game) : server.cleanup(game);
				client.emit('host', resp);
				client.emit('setup', { success: resp.success });
			} else {
				client.emit('host', { success: false, reason: 'server unavailable' });
			}
		},
		// Required data: game => name of game, username => username
		join: function (data) {
			var game = server.get('games', data.name);
			if (game) {
				var join = game.join(client, data.username, false);
				client.emit('join', join);
				if (join.success) {
					game.broadcast('addPlayers', join, false, client);
					game.emit('request', { data: 'board' }, function (board) {
						client.emit('update', { type: 'boardState', data: board });
					});
				}
			}
			client.emit('join', { success: false, reason: 'not exist' });
		},
		startGame: function () {
			var game = client.game;
			game.start();
		},
		endTurn: function () {
			var game = client.game;
			game.endTurn();
		},
		draw: function (data, fn) {
			var game = client.game;
			fn(game.drawCard());
		},
		chat: function (data) {
			var game = client.game;
			game.broadcast('chat', { player: data.player, message: data.message }, true);
		},
		trade: function (data) {
			var game = client.game;
			game.trade(data, client);
		},
		disconnect: function () {
			server.drop(client);
		}
	};
	
	// Set up control
	for (var comm in Commands) {
		if (Commands.hasOwnProperty(comm)) {
			client.on(comm, Commands[comm]);
		}
	}
});




