// Player -------------------------------------------------------------------
// --------------------------------------------------------------------------
var Player = function (o) {
	// State -------------------------------------------------------------
	// -------------------------------------------------------------------
	var self = {
		id: o.id,
		color: o.color,
		name: o.name,
		resources: { grain: 0, ore: 0, brick: 0, wood: 0, wool: 0 },
		developmentCards: { knight: 0, plenty: 0, monopoly: 0, roadBuild: 0, victory: 0 },
		ports: [],
		bonuses: [],
		settlements: [],
		roads: [],
		cities: [],
		count: { resources: 0, developmentCards: 0, victoryPoints: 0 }
	};
	
	// Public ------------------------------------------------------------
	// -------------------------------------------------------------------
	// Create getter and setter methods
	base.accessor(this, self);
	this.update = function (attr, type, amount) {
		self[attr][type] += amount;
		self.count[type] += amount;
	};
	this.addBonus = function (bonus) {
		self.bonuses.push(bonus);
		self.count.victoryPoints += 2;
	};
	this.removeBonus = function (bonus) {
		self.splice(self.bonuses.indexOf(bonus), 1);
		self.count.victoryPoints -= 2;
	};
	this.addPort = function (port) {
		self.ports.push(port);
	};
	this.addPiece = function (piece) {
		var plural = base.string.pluralize(piece.type);
		self[plural].push(piece);
		if (piece.type == 'settlement' || piece.type == 'city') {
			self.count.victoryPoints += 1;
		}
	};
};

// Prototype methods --------------------------------------------------------
// --------------------------------------------------------------------------
Player.prototype.getState = function () {
	var count = this.get('count');
	return { 
		id: this.get('id'), 
		name: this.get('name'), 
		color: this.get('color'), 
		achievement: this.get('bonuses'),
		resourceCount: count.resources,
		developmentCount: count.developmentCards,
		victoryPoints: count.victoryPoints
	};
};
Player.prototype.startTurn = function () {
	// Turn on control actions
	Controller.request(['build', 'useCard', 'chat', 'trade', 'tradeResponse', 'endTurn']);
	// var res = Controller.request('build');
	// console.log('requested build', res);
	// Controller.request('useCard');
	// Controller.request('chat');
	// Controller.request('trade');
	// Controller.request('tradeResponse');
	// Controller.request('endTurn');
};
Player.prototype.endTurn = function () {
	// Turn off control actions
	Controller.release('build');
	Controller.release('useCard');
	Controller.release('trade');
	Controller.release('endTurn');
};
Player.prototype.canBuild = function (piece) {
	var resources = this.get('resources'),
		cost = Game.get('cost')[piece];
	return base.validate(cost, function (amt, type) {
		return amt <= resources[type];
	});
};
Player.prototype.build = function (piece) {
	// Check resource cost of piece
	if (this.canBuild(piece)) {
		var callback = function (pos) {
			Board.validatePlacement(piece, pos) ? Board.place(piece, pos) : Game.popup({ error: 'InvalidPlacement' });
		};
		piece != 'development' ? Controller.activate('place', callback) : this.drawCard();
	}
};
Player.prototype.drawCard = function () {
	var self = this;
	Controller.fire('draw', 'none', function (card) {
		var hasCard = self.get('developmentCards')[card] > 0;
		var view = Game.get('views').developmentCards;
		self.update('developmentCards', card, 1);
		// Create the dom view of the card
		hasCard ? view.update() : view.create([{ name: card, fullName: Game.get('cardNames')[card] }]);
		Controller.on('useCard', $('#development .items a'), 'click', function () { }, 'game');
	});
};
Player.prototype.useCard = function (card) {
	if (this.get('developmentCards')[card] != 0) {
		var view = Game.get('views').developmentCards;
		Game.useCard(card);
		this.update('developmentCards', card, -1);
		view.update();
	}
};
Player.prototype.updateResources = function (resources) {
	var self = this;
	base.each(resources, function (amt, type) {
		self.update('resources', type, amt);
	});
	var resourceView = Game.get('views').resources;
	resourceView.update();
};

