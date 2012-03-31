var fs = require('fs'),
	connect = require('connect'),
	io = require('socket.io'),
	po = require('./player_objects.js'),
	go = require('./game.js'),
	model = require('./model.js');

// Global require
require('./mail/mailer.js');
// Initialize the email system that will track errors
Mailer.init('mail/config.txt', 'mail/template.txt');

try {
	var server = new model.Server(connect);
	var base = io.listen(server.master);
	server.listen(process.env.PORT || 3000);

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
					client.emit('addPlayers', game.getPlayers(), true);
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
						client.broadcast.emit('addPlayers', game.getPlayer({ by: 'clientID', id: client.id }));
						client.emit('addPlayers', game.getPlayers(), true);
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
			},
			
			// Development card messages
			steal: function (data, fn) {
				var game = client.game;
				game.useCard.knight.call(game, data, fn);
			},
			
			monopoly: function (data, fn) {
				server.log('got monopoly');
				var game = client.game;
				game.useCard.monopoly.call(game, data, client, fn);
			},
			
			// User submitted a bug report or feature request
			userSubmit: function (data) {
				server.log('got user submission', data);
				switch (data.type) {
					case 'bug':
						Mailer.send({
							subject: 'Catan - User Bug Report',
							template: 'mail/bug.txt',
							data: {
								description: data.bugDescription,
								steps: data.bugSteps || '',
								additional: data.bugAdditional || ''
							}
						});
						client.emit('confirmation');
						break;
					case 'feature':
						Mailer.send({
							subject: 'Catan - User Feature Request',
							template: 'mail/feature.txt',
							data: {
								name: data.featureName,
								description: data.featureDescription
							}
						});
						client.emit('confirmation');
						break;
					default:
						// We don't support this kind of behavior
						break;
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
} catch (err) {
	Mailer.send({
		subject: err.toString(),
		data: {
			stack: Mailer.formatErrorStack(err.stack)
		}
	});
}




