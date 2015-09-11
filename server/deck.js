/**
 * Deck
 * Represents a deck of development cards in catan
 * Implements the actions of each development card
 */

var _ = require('underscore');
var util = require('./util');


function Deck() {
	// Build deck
	this.cards = _.chain(Deck.Counts)
		.map(util.expand)
		.flatten()
		.value();
	
	util.shuffle(this.cards);
}

Deck.prototype.draw = function () {
	// Remove top card from deck
	return this.cards.shift();
}

Deck.prototype.shuffle = function () {
	// Reshuffle card order
	return util.shuffle(this.cards);
}

// Number of each type of card in the deck at the beginning
Deck.Counts = {
	Knight: 10,
	YearOfPlenty: 2,
	RoadBuilding: 2,
	Monopoly: 2,
	Victory: 5
};

module.exports = Deck;