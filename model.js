var po = require('./player_objects.js'),
	go = require('./game.js'),	
	cryp = require('./js/md5.js');

// Model --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

// Class representing data relationships
function Model () {
	this.game = null;
	this.server = null;
	this.client = null;
}

// CRUD operations
Model.prototype.read = function () { };
Model.prototype.create = function () { };
Model.prototype.update = function () { };
Model.prototype.delete = function () { };

// Export module
exports.Model = function () {
	return new Model();
};

// Client -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Client () {
	this.id = null;
	this.playerid = null;
	this.game = null;
}

Client.prototype.emit = function (message, data) { };

exports.Client = function () {
	return new Client();
};

// Player -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Player (id, client, name, color, isHost) {
	this.id = id;
	this.color = color;
	this.self = client;
	this.name = name;
	this.isHost = isHost || false;
	this.victoryPoints = 0;
}

Player.prototype.addBonus = function () {
	this.victoryPoints += 2;
};
Player.prototype.removeBonus = function () {
	this.victoryPoint -= 2;
};

// Game ---------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Game (server) {
	// Game specific variables
	this.server = server;
	this.name = null;
	this.id = null;
	this.private = false;
	// State variables
	this.minPlayers = 0;
	this.maxPlayers = 0;
	this.numPlayers = 0;
	this.currentTurn = 0;
	this.currentRotation = 0;
	this.turnOrder = [ ];
	this.started = false;
	this.reversing = false;
	
	this.HOST = null;
	this.players = { };
	this.playerList = [ ];
	this.bonuses = { largestArmy: null, longestRoad: null };
	this.developmentCards = [ ];
	this.colors = ['red', 'blue', 'green', 'orange', 'yellow', 'brown', 'white', 'purple'];
}

// Host a new game
Game.prototype.host = function (client, options) {
	console.log('\n\n Hosting options', options, '\n\n');
	// Initialize state for this game
	try {
		// Generate a unique game id
		this.id = cryp.generateUniqueID(options.game);
		// Check if any existing game has the same name
		if (this.server.games[this.id]) {
			return { success: false, reason: 'already exists' };
		}
		this.name = options.game;
		this.private = options.private || false;
		this.minPlayers = 2;
		this.maxPlayers = parseInt(options.players) || 6;
		this.currentTurn = 0;
		this.currentRotation = 0;
		// Add the host to the list of users
		return this.join(client, options.username, true);
	}
	catch (e) {
		console.log('the error is', e);
		return { success: false, reason: 'invalid entry' };
	}
};
// Connect a client to this game
Game.prototype.join = function (client, username, hosting) {
	if (this.available()) {
		console.log('joining');
		var player = new Player(this.numPlayers, client, username, this.generateColor(), hosting);
		this.players[client.id] = player;
		this.HOST = hosting ? player : this.HOST;
		this.numPlayers += 1;
		this.server.clients[client.id].game = this;
		return { success: true, id: player.id, name: player.name, color: player.color };
	}
	else {
		return { success: false, reason: 'full' };
	}
};

Game.prototype.start = function () {
	// Initialize game-specific state
	this.generateTurnOrder();
	this.buildPlayerList();
	this.buildDeck();
	this.started = true;
	// Do initial placement
	this.currentTurn = 0;
	this.currentRotation = 0;
	this.broadcast('startGame', { success: true }, true);
	this.initPlacement();
};

Game.prototype.initPlacement = function () {
	this.server.log('starting initial placement')
	this.server.log('this is the current player:', this.currentRotation);
	var self = this;	// Save local reference for closure
	var player = this.playerList[this.turnOrder[this.currentRotation]];
	player.self.emit('initPlacement', 'test', function (data) {
		self.currentRotation = (self.currentRotation + (self.reversing ? -1 : 1)) % self.numPlayers;
		if (!self.currentRotation) {
			// Got to the end of the current rotation
			if (self.reversing) {
				// End of the initial placement
				self.broadcast('update', { type: 'gameState', data: { turnOrder: self.turnOrder } }, true);
				self.broadcast('startTurn', { roll: self.util.roll(), turn: self.currentTurn }, true);
			} else {
				self.reversing = true;
				self.currentRotation = self.numPlayers - 1;
				// Recurse
				self.initPlacement();
			}
		} else {
			// Recurse
			self.initPlacement();
		}
	});
};

Game.prototype.endTurn = function () {
	var i = this.currentRotation;
	var player = this.playerList[this.turnOrder[i]];
	player.self.emit('endTurn', { }, function () {
		this.currentRotation += 1;
		if (this.currentRotation == this.currentTurn) {
			this.currentTurn += 1;
			this.currentRotation = this.currentTurn + 1;
			this.broadcast('startTurn', { roll: this.util.roll(), turn: this.currentTurn }, true);
		} else {
			this.endTurn();
		}
	});
};

Game.prototype.trade = function (data, sender) {
	var recipient = this.playerList[this.turnOrder.indexOf(data.id)];
	recipient.self.emit('trade', { request: data.request }, function (accept) {
		sender.emit('trade', { accept: accept });
		recipient.self.emit('trade', { accept: accept });
	});
};

Game.prototype.available = function () {
	return !this.started && this.numPlayers < this.maxPlayers;
};

Game.prototype.close = function (force, reason) {
	if (force) {
		this.broadcast('update', { type: 'close', data: { error: true, reason: reason } }, true);
		
	}
};

/*
Game.prototype.start = function () {
	this.started = true;
	for (var i = 0; i < this.numPlayers; i++) {
		this.turnOrder.push(i);
	}
	// Generate the turn order
	this.util.shuffle(this.turnOrder);
	this.initPlacement();
};
Game.prototype.initPlacement = function () {
	console.log('\n\n', 'Doing the placement thing', '\n\n');
	if (this.currentRotation < 0) {
		console.log('\n', 'starting the game', '\n');
		this.currentRotation = 0;
		// Actually start the game
		this.broadcast('start', {
			success: true,
			turnOrder: this.turnOrder,
			roll: this.util.rollDice(),
			turn: this.turnOrder[this.currentTurn]
		});
	}
	else {
		var current = this.turnOrder[this.currentRotation];
		console.log('\n\n', 'The current player is', current, '\n\n');
		this.findPlayer(current).self.emit('pregame');
		this.reversing ? --this.currentRotation : ++this.currentRotation;
		if (this.currentRotation == this.turnOrder.length) {
			this.reversing = true;
			this.currentRotation -= 1;
		}
	}
};
Game.prototype.endTurn = function () {
	this.currentRotation = (this.currentRotation + 1) % this.numPlayers;
	if (this.currentRotation == this.currentTurn) {
		// End and start the next turn
		++this.currentTurn;
		this.currentRotation = this.currentTurn;
		// Check if the current player has won
		var turn = this.turnOrder[this.currentTurn],
			result = { message: 'startTurn', roll: this.util.rollDice(), turn: this.turnOrder[this.currentTurn] };
		if (Game.findPlayer(turn).victoryPoints >= 10) {
			result.victory = true;
		}
		return result;
	}
	else {
		// Ask the next player if they want to build something
		return { message: 'endTurn', turn: this.turnOrder[this.currentRotation] };
	}
};
// Return a list of all the players in this game
Game.prototype.getPlayers = function () {
	var players = [];
	for (var id in this.players) {
		if (this.players.hasOwnProperty(id)) {
			players.push({ id: this.players[id].id, name: this.players[id].name, color: this.players[id].color });
		}
	}
	return players;
};
// Find a player based on their id in game
Game.prototype.findPlayer = function (id) {
	for (var player in this.players) {
		if (this.players.hasOwnProperty(player)) {
			if (this.players[player].id == id) {
				return this.players[player];
			}
		}
	}
};
Game.prototype.dropPlayer = function (client) {
	--this.numPlayers;
	delete this.players[client.id];
};
// Update the state of a player
Game.prototype.update = function (data, client) {
	var player = this.players[client.id];
	if (data.card && data.type == 'victory') {
		player.victoryPoints += 1;
	}
	else if (data.bonus) {
		if (this.bonuses[data.bonus]) {
			// Remove the bonus from the current player
			this.bonuses[data.bonus].removeBonus();
		}
		this.bonuses[data.bonus] = player;
		player.addBonus();
	}
};
// Convenience function for checking if a game is available (not full, and hasn't started)
Game.prototype.available = function () {
	return !this.started && (this.numPlayers < this.maxPlayers);
};
// Send a chat message to each client in the game
Game.prototype.broadcast = function (message, data, sender) {
	// Send the message to each client
	for (var player in this.players) {
		if (this.players.hasOwnProperty(player)) {
			if (!sender || data.self || (this.players[player].self.id != sender.id)) {
				this.players[player].self.emit(message, data);
			}
		}
	}
};
*/
Game.prototype.broadcast = function (message, data, includeSender, sender) {
	for (var id in this.players) {
		if (this.players.hasOwnProperty(id)) {
			if (includeSender || id != sender.id) {
				this.players[id].self.emit(message, data);
			}
		}
	}
};

Game.prototype.generateColor = function () {
	return this.colors.pop();
};

// Initialize the development cards for this game
Game.prototype.buildDeck = function () {
	// Instantiate a full set of development cards
	var cardTypes = [
		{ type: 'roadBuilding', count: 3 },
		{ type: 'yearOfPlenty', count: 3 },
		{ type: 'monopoly', count: 3 },
		{ type: 'knight', count: 15 },
		{ type: 'victory', count: 5 }
	];
	for (var i = 0; i < cardTypes.length; i++) {
		for (var k = 0; k < cardTypes[i].count; k++) {
			this.developmentCards.push(new po.DevelopmentCard(cardTypes[i].type));
		}
	}
	// Shuffle the cards
	this.util.shuffle(this.developmentCards);
};

Game.prototype.buildPlayerList = function () {
	var players = this.players;
	for (var i = 0; i < this.numPlayers; i++) {
		var current = this.turnOrder[i];
		for (var id in players) {
			if (players.hasOwnProperty(id) && players[id].id == current) {
				this.playerList.push(players[id]);
			}
		}
	}
};

Game.prototype.generateTurnOrder = function () {
	for (var id in this.players) {
		if (this.players.hasOwnProperty(id)) {
			this.turnOrder.push(this.players[id].id);
		}
	}
	this.util.shuffle(this.turnOrder);
};


Game.prototype.drawCard = function () {
	// Deck works as a queue
	return this.developmentCards.shift();
}
// Utility class to help with other methods
Game.prototype.util = {
	shuffle: function (array) {
		var tmp, current, top = array.length;
		if (top) {
			while (--top) {
				current = Math.floor(Math.random() * (top+1));
				tmp = array[current];
				array[current] = array[top];
				array[top] = tmp;
			}
		}
		return array;
	},
	roll: function () {
		return ((Math.random()*12) >> 1) + ((Math.random()*12) >> 1);
	}
};

exports.Game = function (server) {
	return new Game(server);
};

// Server -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Server (module) {
	this.maxGames = 10;
	this.numGames = 0;
	this.games = { };
	this.clients = { };
	
	// Initialize the server
	this.master = module.createServer(
		module.logger(),
		module.static(__dirname)
	);
}
// Wrapper functionality
Server.prototype.listen = function (port, ip) {
	this.master.listen(port, ip);
};

Server.prototype.open = function () {
	return this.numGames < this.maxGames;
};

Server.prototype.cleanup = function (game) {
	delete this.games[game.id];
	this.numGames -= 1;
};

Server.prototype.register = function (type, o) {
	if (type == 'game') {
		this.games[o.id] = o;
		this.numGames += 1;
	} else if (type == 'client') {
		this.clients[o.id] = o;
	}
};

Server.prototype.drop = function (client) {
	if (client.game && client.game.HOST.self.id == client.id) {
		client.game.close(true, 'host drop');
		this.cleanup(client.game);
	}
	delete this.clients[client.id];
};

Server.prototype.get = function (type, id) {
	var _id = type == 'games' ? cryp.generateUniqueID(id) : id;
	return this[type][_id];
};

Server.prototype.log = function () {
	var args = arguments;
	console.log('\n');
	for (var i = 0; i < args.length; i++) {
		console.log(args[i], ' ');
	}
	console.log('\n');
};

/*
// Game functionality
Server.prototype.newGame = function (client, options) {
	if (this.numGames < this.maxGames) {
		var game = new Game(this),
			host = game.host(client, options);
		if (host.success) {
			this.games[game.id] = game;
			++this.numGames;
		}
		return host;
	}
	return { success: false, reason: 'server full' };
};
// Remove the specified game from the server
Server.prototype.closeGame = function (game) {
	delete this.games[game.id];
};
// Return the game specified by the given name
Server.prototype.findGame = function (name) {
	var id = cryp.generateUniqueID(name);
	return this.games[id] || null;
};
Server.prototype.listGames = function () {
	var games = this.games,
		results = [];
	for (var id in games) {
		if (games.hasOwnProperty(id) && games[id].available()) {
			results.push({
				name: games[id].name,
				count: games[id].numPlayers,
				max: games[id].maxPlayers
			});
		}
	}
	return results;
};

// Client functionality
Server.prototype.addClient = function (client) {
	this.clients[client.id] = { client: client, user: null, game: null };
};
// Remove a client from the  server, and close any games they were hosting
Server.prototype.removeClient = function (id) {
	console.log('removing client', id);
	var client = this.clients[id];
	console.log('client', client);
	if (client) {
		if (client.game) {
			client.game.dropPlayer(client);
			this.closeGame(client.game);
		}
		delete this.clients[id];
	}
	else {
		console.log('client with id', id, 'does not exist.');
	}
};
*/

exports.Server = function (o) {
	return new Server(o);
};


