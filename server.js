var connect = require('connect'),
	io = require('socket.io'),
	go = require('./game.js'),
	model = require('./model.js');

var server = new model.Server(connect);
var socket = io.listen(server.master);
server.listen(1337, '192.168.1.112');

socket.sockets.on('connection', function (client) {
	server.addClient(client);
	client.on('host', function (options) {
		console.log('user hosting');
		var game = server.newGame();
		if (game) {
			game.host(client, options);
			client.emit('host', { success: true, id: game.id });
		}
		else {
			client.emit('host', { success: false, reason: 'full' });
		}
	});
	
	client.on('list', function () {
		client.emit('list', { games: server.listGames() });
	});
	
	client.on('join', function (data) {
		console.log('user joining');
		console.log('\n\n Join Data', data, '\n\n');
		var game = server.findGame(data.game);
		if (game) {
			game.join(server, client, data.user);
		}
		else {
			client.emit('join', { success: false, reason: 'not exist' });
		}
	});
	
	client.on('disconnect', function (data) {
		console.log('\n\nDisconnecting...\n\n');
		// Remove the client from the list
		server.removeClient(client.id);
	});
	
	client.on('chat', function (data) {
		// TODO: find the gmae that this client belongs to
		// game.broadcast(client, data.message);
		console.log('\n\nChat message', data.message, '\n\n');
		client.broadcast.emit('chat', data);
		client.emit('chat', data);
	});
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


