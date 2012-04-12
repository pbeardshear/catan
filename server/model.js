var cryp = require('./lib/md5.js');

// Global includes
require('./lib/mail/mailer.js');
// Initialize error tracker
Mailer.init('./server/lib/mail/config.txt', './server/lib/mail/template.txt');

process.on('uncaughtException', function (err) {
	console.log('Uncaught Exception:', err);
	Mailer.send({
		subject: err.toString(),
		data: {
			stack: Mailer.formatErrorStack(err.stack)
		}
	});
});

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
	this.allowBuildBetweenTurns = false;
	this.colors = ['red', 'blue', 'cyan', 'gold', 'green', 'purple'];
}

// Host a new game
Game.prototype.host = function (client, options) {
	// console.log('\n\n Hosting options', options, '\n\n');
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
		// console.log('the error is', e);
		return { success: false, reason: 'invalid entry' };
	}
};
// Connect a client to this game
Game.prototype.join = function (client, username, hosting) {
	if (this.available()) {
		// console.log('joining');
		var player = new Player(this.numPlayers, client, username, this.generateColor(), hosting);
		this.players[client.id] = player;
		this.playerList.push(player);
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
	this.buildDeck();
	this.started = true;
	// Do initial placement
	this.currentTurn = 0;
	this.currentRotation = 0;
	this.broadcast('startGame', { success: true }, true);
	this.initPlacement();
};

Game.prototype.initPlacement = function () {
	this.server.log('player list', this.playerList);
	this.server.log('starting initial placement')
	this.server.log('this is the current player:', this.currentRotation);
	var self = this;	// Save local reference for closure
	var player = this.playerList[this.currentRotation];
	player.self.emit('initPlacement', 'none', function (data) {
		self.server.log('got callback', self.numPlayers, self.currentRotation);
		self.currentRotation = (self.currentRotation + (self.reversing ? -1 : 1)) % self.numPlayers;
		self.server.log('got callback', self.numPlayers, self.currentRotation);
		if (!self.currentRotation) {
			// Got to the end of the current rotation
			if (self.reversing) {
				// TODO: Think of a more robust solution
				// Special case - handle the first player's second turn here, then start the game
				// End of the initial placement
				var firstPlayer = self.playerList[self.currentRotation];
				firstPlayer.self.emit('initPlacement', 'none', function (data) {
					self.broadcast('update', { type: 'gameState', data: { turnOrder: self.turnOrder } }, true);
					self.broadcast('startTurn', { roll: self.util.roll(), turn: self.currentTurn }, true);
				});
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
	var player = this.playerList[i];
	var self = this;
	if (this.allowBuildBetweenTurns) {
		player.self.emit('endTurn', { }, function () {
			self.currentRotation += 1;
			if (self.currentRotation == self.currentTurn) {
				self.currentTurn += 1;
				self.currentRotation = self.currentTurn + 1;
				if (self.victoryCheck()) {
					self.broadcast('victory', { player: self.playerList[self.currentTurn].id });
				} else {
					self.broadcast('startTurn', { roll: self.util.roll(), turn: self.currentTurn }, true);
				}
			} else {
				self.endTurn();
			}
		});
	} else {
		if (self.victoryCheck()) {
			self.broadcast('victory', { player: self.playerList[self.currentTurn].id });
		} else {
			self.currentTurn = (self.currentTurn + 1) % self.numPlayers;
			self.broadcast('startTurn', { roll: self.util.roll(), turn: self.currentTurn }, true);
		}
	}
};

Game.prototype.trade = function (data, sender) {
	var recipient = this.playerList[this.turnOrder.indexOf(data.id)];
	recipient.self.emit('trade', { request: data.request, sender: data.sender }, function (accept) {
		sender.emit('trade', { accept: accept });
		recipient.self.emit('trade', { accept: accept });
	});
};

Game.prototype.available = function () {
	return !this.started && this.numPlayers < this.maxPlayers;
};

// Returns true and the player if any player has at least 10 victory points, and its their turn
// Otherwise, returns false
Game.prototype.victoryCheck = function () {
	var currentPlayer = this.playerList[this.currentTurn];
	if (currentPlayer.victoryPoints >= 10) {
		return true;
	}
	return false;
};

Game.prototype.close = function (force, reason) {
	if (force) {
		this.broadcast('update', { type: 'close', data: { error: true, reason: reason } }, true);
		
	}
};

Game.prototype.broadcast = function (message, data, includeSender, sender) {
	for (var id in this.players) {
		if (this.players.hasOwnProperty(id)) {
			if (includeSender || id != sender.id) {
				this.players[id].self.emit(message, data);
			}
		}
	}
};

Game.prototype.getPlayer = function (options) {
	if (options.by == 'clientID') {
		var player = this.players[options.id];
		return { id: player.id, name: player.name, color: player.color };
	} else if (options.by == 'gameID') {
		var players = this.playerList;
		// Player list is sorted by turn order, not game id...
		for (var i = 0; i < players.length; i++) {
			if (players[i].id == options.id) {
				return players[i];
			}
		}
	}
};

Game.prototype.getPlayers = function (exclude) {
	var players = [];
	for (var i = 0; i < this.numPlayers; i++) {
		var p = this.playerList[i];
		if (exclude != p.id) players.push({ name: p.name, color: p.color, id: p.id });
	}
	return players;
};

Game.prototype.updatePlayer = function (data) {
	switch (data.type) {
		case 'victoryPoints':
			var player = this.getPlayer({ by: 'clientID', id: data.player });
			player.victoryPoints += 1;
			if (this.victoryCheck()) {
				// Winner!
				this.broadcast('victory', { player: self.playerList[self.currentTurn].id });
			}
			break;
	}
};

Game.prototype.generateColor = function () {
	return this.colors.pop();
};

// Initialize the development cards for this game
Game.prototype.buildDeck = function () {
	// Instantiate a full set of development cards
	var cardTypes = [
		{ type: 'roadBuild', count: 3 },
		{ type: 'plenty', count: 3 },
		{ type: 'monopoly', count: 3 },
		{ type: 'knight', count: 15 },
		{ type: 'victory', count: 5 }
	];
	for (var i = 0; i < cardTypes.length; i++) {
		for (var k = 0; k < cardTypes[i].count; k++) {
			this.developmentCards.push(cardTypes[i].type);
			// this.developmentCards.push(new po.DevelopmentCard(cardTypes[i].type));
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
	// Rearrange the player list to be in turn order
	var tempList = [];
	for (var i = 0; i < this.playerList.length; i++) {
		tempList[i] = this.playerList[this.turnOrder[i]];
	}
	this.playerList = tempList;
};

Game.prototype.drawCard = function (client) {
	// Deck works as a queue
	var card = this.developmentCards.shift();
	if (card == 'victory') {
		// Increment victory points
		this.players[client.id].victoryPoints += 1;
	}
	return card;
}

// Server-side development card effects
Game.prototype.useCard = {
	knight: function (data, fn) {
		var player = this.getPlayer({ by: 'gameID', id: data.player });
		player.self.emit('steal', 'none', function (type) {
			var resource = {};
			resource[type] = 1;
			// Return to the sender the resource that was stolen
			fn(resource);
		});
	},
	
	monopoly: function (data, client, fn) {
		var players = this.playerList,
			resources = {};
		// Iterate over each player, and request their resources in turn
		var asyncIterator = function (i) {
			if (i >= players.length) {
				// console.log('finished monopoly:', fn);
				fn(resources);
				return;
			}
			if (players[i].self != client) {
				// console.log('emitting to player:', players[i].name);
				players[i].self.emit('monopoly', { resource: data.resource }, function (count) {
					resources[data.resource] += count;
					asyncIterator(i + 1);
				});
			} else {
				asyncIterator(i + 1);
			}
		}
		
		this.server.log('got monopoly call');	
		resources[data.resource] = 0;
		asyncIterator(0);
	}
};

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
		return Math.ceil(Math.random()*6) + Math.ceil(Math.random()*6);
	}
};

exports.Game = function (server) {
	return new Game(server);
};

// Server -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Server (module) {
	this.maxGames = 100;
	this.numGames = 0;
	this.games = { };
	this.clients = { };
	
	// Initialize the server
	this.master = module.createServer(
		module.logger(),
		module.static('client')
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

Server.prototype.listGames = function () {
	var gameList = []
	for (var id in this.games) {
		var game = this.games[id];
		if (this.games.hasOwnProperty(id) && game.available()) {
			gameList.push({ name: game.name, count: game.numPlayers, max: game.maxPlayers });
		}
	}
	return gameList;
};

Server.prototype.drop = function (client) {
	if (client.game && client.game.HOST.self.id == client.id) {
		this.log('host has dropped');
		client.game.close(true, 'host drop');
		this.cleanup(client.game);
	}
	delete this.clients[client.id];
};

Server.prototype.get = function (type, id) {
	// console.log('this is the game id:', id);
	var _id = type == 'games' ? cryp.generateUniqueID(id) : id;
	return this[type][_id];
};

Server.prototype.log = function () {
	var args = arguments;
	// console.log('\n');
	for (var i = 0; i < args.length; i++) {
		// console.log(args[i], ' ');
	}
	// console.log('\n');
};

exports.Server = function (o) {
	return new Server(o);
};

