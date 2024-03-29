var http = require('http');
var io = require('socket.io');
var serverStatic = require('serve-static');
var finalHandler = require('finalhandler');


// Hook into the top level exception handler
// This should prevent the server from crashing on an error, and will catch asynchronous errors in callbacks
process.on('uncaughtException', function (err) {
	console.log('Uncaught Exception:', err);
	console.log(err.stack);
});

// Lobby - list of games
// Game - token, board state, list of players
//  - token used for URL to find game
//  - board state: list of players, colors, pieces, tiles, numbers
// Player - token, name, email?
//  - email used to notify player when it is their turn
//  - token is game specific?
//  - no email for now (use chrome desktop notifications, assume player will complete game)


var serve = serverStatic('client')


var server = http.createServer(function (req, res) {
	var done = finalHandler(req, res);
	serve(req, res, done);
});

server.listen(process.env.PORT || 3000, function () {
	console.log('Server started');
});




// socket = io(app);

// socket.on('connection', function () {

// })

// app.listen(process.env.PORT || 3000, function () {
// 	console.log('Server started.');
// });

// var server = new model.Server(connect);
// var base = io.listen(server.master);
// server.listen(process.env.PORT || 3000);

// Tell socket.io to use long polling, since Heroku doesn't currently support WebSockets
// base.configure(function () {
// 	base.set("transports", ["xhr-polling"]);
// 	base.set("polling duration", 10);
// });

// base.sockets.on('connection', function (client) {
// 	server.register('client', client);
	
	// Define actions that the client is allowed to make
	// var Commands = {
	// 	// Required data: game => name of game, username => username, players => max number of players
	// 	host: function (data) {
	// 		if (server.open()) {
	// 			var game = new model.Game(server);
	// 			var resp = game.host(client, data);
	// 			resp.success ? server.register('game', game) : server.cleanup(game);
	// 			client.emit('host', resp);
	// 			client.emit('addPlayers', game.getPlayers(), true);
	// 			client.emit('setup', { success: resp.success });
	// 		} else {
	// 			client.emit('host', { success: false, reason: 'server unavailable' });
	// 		}
	// 	},
	// 	// Required data: game => name of game, username => username
	// 	join: function (data) {
	// 		server.log('join data:', data);
	// 		var game = server.get('games', data.game);
	// 		if (game) {
	// 			var join = game.join(client, data.username, false);
	// 			client.emit('join', join);
	// 			if (join.success) {
	// 				client.broadcast.emit('addPlayers', game.getPlayer({ by: 'clientID', id: client.id }));
	// 				client.emit('addPlayers', game.getPlayers(), true);
	// 				game.HOST.self.emit('request', { data: 'board' }, function (board) {
	// 					client.emit('update', { type: 'boardState', data: board });
	// 				});
	// 			}
	// 		} else {
	// 			client.emit('join', { success: false, reason: 'not exist' });
	// 		}
	// 	},
	// 	// Return a list of available games
	// 	listGames: function () {
	// 		var games = server.listGames();
	// 		client.emit('listGames', games);
	// 	},
	// 	startGame: function () {
	// 		var game = client.game;
	// 		game.start();
	// 	},
	// 	endTurn: function () {
	// 		var game = client.game;
	// 		game.endTurn();
	// 	},
	// 	draw: function (data, fn) {
	// 		server.log('received draw command');
	// 		var game = client.game;
	// 		fn(game.drawCard(client));
	// 	},
	// 	chat: function (data) {
	// 		var game = client.game;
	// 		game.broadcast('chat', { player: data.player, message: data.message }, true);
	// 	},
	// 	trade: function (data) {
	// 		var game = client.game;
	// 		game.trade(data, client);
	// 	},
	// 	disconnect: function () {
	// 		server.drop(client);
	// 	},
	// 	update: function (options) {
	// 		server.log('got update', options);
	// 		if (options.dest == 'client') {
	// 			// TODO: Hardcoded, rework to make more flexible
	// 			client.game.broadcast('update', { type: options.type, data: options.data }, options.self, client);
	// 		} else if (options.dest == 'server') {
	// 			// TODO: Update server state
	// 			client.game.updatePlayer({ type: options.type, data: options.data, player: client.id });
	// 		}
	// 	},
		
	// 	// Development card messages
	// 	steal: function (data, fn) {
	// 		var game = client.game;
	// 		game.useCard.knight.call(game, data, fn);
	// 	},
		
	// 	monopoly: function (data, fn) {
	// 		server.log('got monopoly');
	// 		var game = client.game;
	// 		game.useCard.monopoly.call(game, data, client, fn);
	// 	},
		
	// 	// User submitted a bug report or feature request
	// 	userSubmit: function (data) {
	// 		server.log('got user submission', data);
	// 		switch (data.type) {
	// 			case 'bug':
	// 				Mailer.send({
	// 					subject: 'Catan - User Bug Report',
	// 					template: 'server/lib/mail/bug.txt',
	// 					data: {
	// 						description: data.bugDescription,
	// 						steps: data.bugSteps || '',
	// 						additional: data.bugAdditional || ''
	// 					}
	// 				});
	// 				client.emit('confirmation');
	// 				break;
	// 			case 'feature':
	// 				Mailer.send({
	// 					subject: 'Catan - User Feature Request',
	// 					template: 'server/lib/mail/feature.txt',
	// 					data: {
	// 						name: data.featureName,
	// 						description: data.featureDescription
	// 					}
	// 				});
	// 				client.emit('confirmation');
	// 				break;
	// 			default:
	// 				// We don't support this kind of behavior
	// 				break;
	// 		}
	// 	}
	// };
	
	// // Set up control
	// for (var comm in Commands) {
	// 	if (Commands.hasOwnProperty(comm)) {
	// 		client.on(comm, Commands[comm]);
	// 	}
	// }
// });

