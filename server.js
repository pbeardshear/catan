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
			server.log('join data:', data);
			var game = server.get('games', data.game);
			server.log('i got the game', game);
			if (game) {
				var join = game.join(client, data.username, false);
				client.emit('join', join);
				if (join.success) {
					client.broadcast.emit('addPlayers', game.getPlayer({ by: 'clientID', id: client.id}));
					client.emit('addPlayers', game.getPlayers(join.id), true);
					game.HOST.self.emit('request', { data: 'board' }, function (board) {
						client.emit('update', { type: 'boardState', data: board });
					});
				}
			} else {
				client.emit('join', { success: false, reason: 'not exist' });
			}
		},
		// Return a list of available games
		listGames: function () {
			var games = server.listGames();
			client.emit('listGames', games);
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
			server.log('received draw command');
			var game = client.game;
			fn(game.drawCard(client));
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
		},
		update: function (options) {
			server.log('got update', options);
			if (options.dest == 'client') {
				// TODO: Hardcoded, rework to make more flexible
				client.game.broadcast('update', { type: options.type, data: options.data }, options.self, client);
			} else if (options.dest == 'server') {
				// TODO: Update server state
			}
		}
	};
	
	// Set up control
	for (var comm in Commands) {
		if (Commands.hasOwnProperty(comm)) {
			client.on(comm, Commands[comm]);
		}
	}
});




