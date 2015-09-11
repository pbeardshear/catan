/** 
 * Player
 * A player is a per-game object that owns
 * cards, structures, and resources
 */

var underscore = require('underscore');
var util = require('./util');


function Player(id) {
	this.id = id || util.guid();
	// Player color is set when the player joins a game
	this.color = null;

	// Initialize default state
	this.cards = [];
	this.resources = [];
	this.structures = {};
}


Player.prototype.load = function (args) {
	// Players with existing IDs shouldn't be updated with other player's properties
	// TODO: maybe throw an error instead?
	if (args.id && this.id != args.id) {
		console.warning('[WARNING]: overwriting existing player id:', this.id, 'with new id:', args.id);
	}

	_.extend(this, args);
	return this;
}


module.exports = Player;
