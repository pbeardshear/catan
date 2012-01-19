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
function Player (id, client, name, isHost) {
	this.id = id;
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
	this.board = null;
	this.minPlayers = 0;
	this.maxPlayers = 0;
	this.numPlayers = 0;
	this.currentTurn = 0;
	this.currentRotation = 0;	// Used at the end of the turn, when each player is given a chance to build
	this.turnOrder = [];
	this.started = false;
	
	this.players = {};
	this.bonuses = { largestArmy: null, longestRoad: null };
	this.developmentCards = [];
}

// Host a new game
Game.prototype.host = function (client, options) {
	console.log('\n\noptions', options, '\n\n');
	// Initialize state for this game
	try {
		// Generate a unique game id
		this.id = cryp.generateUniqueID(options.game);
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
		this.players[client.id] = new Player(this.numPlayers, client, username, hosting);
		++this.numPlayers;
		console.log('server', this.server);
		this.server.clients[client.id].game = this;
		return { success: true, id: (this.numPlayers - 1), name: username };
	}
	else {
		return { success: false, reason: 'full' };
	}
};
Game.prototype.start = function () {
	this.started = true;
	for (var i = 0; i < this.numPlayers; i++) {
		this.turnOrder.push(i);
	}
	// Generate the turn order
	this.util.shuffle(this.turnOrder);
	// Alert all players of the turn order and the current turn
	this.broadcast('start', { 
		success: true, 
		turnOrder: this.turnOrder,
		roll: this.util.rollDice(),
		turn: this.turnOrder[this.currentTurn]
	});
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
Game.prototype.broadcast = function (message, data) {
	// Send the message to each client
	for (var player in this.players) {
		if (this.players.hasOwnProperty(player)) {
			this.players[player].self.emit(message, data);
		}
	}
	// var clients = this.server.clients;
	// for (var i = 0; i < this.players.length; i++) {
		// clients[this.players[i].id].emit(message, data);
	// }
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
	rollDice: function () {
		return ((Math.random()*12) >> 1) + ((Math.random()*12) >> 1);
	}
};

// Server -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function Server (module) {
	this.maxGames = 10;
	this.games = [];
	// TODO: consider storing clients as a dictionary keyed on id for faster lookups
	// Also, store the game that they are in, so that chats and things like that can
	// be correctly routed
	this.clients = { };
	
	// Initialize the server
	console.log('\n\ndirectory: ', __dirname, '\n\n');
	this.master = module.createServer(
		module.logger(),
		module.static(__dirname)
	);
}
// Wrapper functionality
Server.prototype.listen = function (port, ip) {
	this.master.listen(port, ip);
};

// Game functionality
Server.prototype.newGame = function () {
	var game = null;
	if (this.games.length < this.maxGames) {
		game = new Game(this);
		this.games.push(game);
	}
	return game;
};
// Remove the specified game from the server
Server.prototype.closeGame = function (game) {
	for (var i = 0; i < this.games.length; i++) {
		if (this.games[i].id == game.id) {
			// Found the game, end it
			this.games.splice(i, 1);
		}
	}
};
// Return the game specified by the given id
Server.prototype.findGame = function (name) {
	var id = cryp.generateUniqueID(name);
	for (var i = 0; i < this.games.length; i++) {
		if (this.games[i].id === id) {
			return this.games[i];
		}
	}
};
Server.prototype.listGames = function () {
	var games = this.games,
		results = [];
	// Massage data into a more readable form
	for (var i = 0; i < games.length; i++) {
		if (games[i].available()) {
			results.push({
				name: games[i].name,
				count: games[i].numPlayers,
				max: games[i].maxPlayers
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

exports.Server = function (o) {
	return new Server(o);
};


