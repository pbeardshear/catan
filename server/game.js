/**
 * Catan Game
 * Contains all state related to a current catan game
 */

var Board = require('./Board');
var Deck = require('./Deck');
var util = require('./util');


function Game() {
	// TODO: guid
	this.id = null;

	// Current board state
	this.board = {
		// Tuple of type:number
		tiles: {},
		// Vertex location of port + type
		ports: {}
	};

	// Current player state
	this.players = {
		'': {
			color: '',
			cards: [],
			resources: [],
			// Type of structure at each index (1 => road, 2 => settlement, 3 +> castle)
			structures: {}
		}
	};

	this.turnOrder = [];

	this.currentTurn = 0;

	// Development cards currently in deck
	this.deck = [];

	// Ordering of available player colors
	// When a new player joins, they are given the next color from this list
	this.colors = util.colors(12);

	this.robber = null;
}


Game.prototype.start = function (params) {
	// Initialize board
	this.board = new Board();

	this.deck = new Deck();

	// Place the robber on the first returned desert tile
	this.robber = this.board.locations(Board.Tiles.Desert)[0];

	// Prevent new players from joining a game in progress
	this.players = Object.freeze(this.players);

	util.shuffle(this.turnOrder);

	// Start the first player's turn
	return this.turn();
}

Game.prototype.turn = function () {
	// Start turn of the current player
	// Before starting a turn, check if anyone has won
	var winner = _.findWhere(this.players, function (player) {
		return player.victoryPoints >= 20;
	});

	if (winner) {
		// Congrats, winner!
		// TODO:
	}

	// Loop the turn if we got to the end
	this.currentTurn = this.currentTurn % this.turnOrder;

	// Otherwise, continue with turn
	// TODO: what needs to be returned to communication layer
	return this.turnOrder[this.currentTurn++];
}

Game.prototype.addPlayer = function (player) {
	// Add player state to game
	if (player.id in this.players) {
		// Player is rejoining the game, reconstitute them based on current game state
		player.load(this.players[player.id]);
	}
	else {
		// New player is joining the game
		player.color = this.colors.shift();
		this.players[player.id] = player;
	}

	this.turnOrder.push(player.id);

	return player;
}

Game.prototype.removePlayer = function (player) {
	// Remove player state from game
	// Owned structures become abandoned
	// TODO: decide how to handle this
}


Game.Structures = {
	Road:		0x1,
	Settlement:	0x2,
	City: 		0x4
}


module.exports = Game;
