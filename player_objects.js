// Road -----------------------------------------------------
// ----------------------------------------------------------
function Road (o) {
	this.position = o.pos || null;
	this.owner = o.owner || null;
}

exports.Road = function (o) {
	return new Road(o);
};

// Settlement -----------------------------------------------
// ----------------------------------------------------------
function Settlement (o) {
	this.position = o.pos || null;
	this.owner = o.owner || null;
}

exports.Settlement = function (o) {
	return new Settlement(o);
};

// City -----------------------------------------------------
// ----------------------------------------------------------
function City (o) {
	this.position = o.pos || null;
	this.owner = o.owner || null;
}

exports.City = function (o) {
	return new City(o);
};

// Development Card -----------------------------------------
// ----------------------------------------------------------
function DevelopmentCard (type) {
	// Valid types are currently: roadBuilding, yearOfPlenty, monopoly, knight, victory
	this.type = type;
	this.owner = null;
}

DevelopmentCard.prototype.give = function (player) {
	player.developmentCards.push(this);
	this.owner = player;
};

exports.DevelopmentCard = function (type) {
	return new DevelopmentCard(type);
};

// Resource Card --------------------------------------------
// ----------------------------------------------------------
function ResourceCard (type, owner) {
	this.type = type;
	this.owner = owner;
}

ResourceCard.prototype.give = function (player) {
	player.resources.push(this);
	this.owner = player;
};
