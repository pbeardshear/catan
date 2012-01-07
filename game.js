var po = require('./player_objects.js');

// Board ----------------------------------------------------
// ----------------------------------------------------------
function Board () { 
	this.lands = [];
	this.roads = { };
	this.objects = { };
}

exports.Board = function () {
	return new Board();
};

// Player ---------------------------------------------------
// ----------------------------------------------------------
function Player (id, name) {
	this.id = id;
	this.name = name;
	this.resources = [];
	this.developmentCards = [];
}

Player.prototype.addCard = function (card) {
	if (card instanceof po.ResourceCard || card instanceof po.DevelopmentCard) {
		card.give(this);
	}
	else {
		// Something wrong was added
		console.log("Tried to add:", card, "to a player's hand.");
	}
};

exports.Player = function () {
	return new Player();
};

// Resource -------------------------------------------------
// ----------------------------------------------------------
function Resource (cfg) {
	this.type = cfg.type;
	this.roll = cfg.roll;
}

exports.Resource = function () {
	return new Resource();
};

Resource.prototype.harvest = function () { };
