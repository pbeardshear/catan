/**
 * Catan Game
 * Contains all state related to a current catan game
 */

var Board = require('./Board');
var Deck = require('./Deck');


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

	// Development cards currently in deck
	this.deck = [];


	// !OBSOLETE
	// Mapping of player token => color
	this.colors = {};

	// Mapping of player token => development cards
	this.cards = {};

	// Mapping of player token => resource cards
	this.resources = {};
}


Game.prototype.start = function (params) {
	// Initialize board
	this.board = new Board();

	this.deck = new Deck();

	// Prevent new players from joining a game in progress
	this.players = Object.freeze(this.players);
}

Game.prototype.addPlayer = function (player) {
	// Add player state to game
}

Game.prototype.removePlayer = function (player) {
	// Remove player state from game
	// Owned structures become abandoned
}


module.exports = Game;
