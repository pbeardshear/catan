// Player -------------------------------------------------------------------
// --------------------------------------------------------------------------
// var Player = function (o) {
	// // State -------------------------------------------------------------
	// // -------------------------------------------------------------------
	// var self = {
		// id: o.id,
		// color: o.color,
		// name: o.name,
		// resources: { grain: 0, ore: 0, brick: 0, wood: 0, wool: 0 },
		// developmentCards: { knight: 0, plenty: 0, monopoly: 0, roadBuild: 0, victory: 0 },
		// ports: [],
		// bonuses: [],
		// settlements: [],
		// roads: [],
		// cities: [],
		// count: { resources: 0, developmentCards: 0, victoryPoints: 0 }
	// };
	
	// // Public ------------------------------------------------------------
	// // -------------------------------------------------------------------
	// // Create getter and setter methods
	// base.accessor(this, self);
	// this.update = function (attr, type, amount) {
		// self[attr][type] += amount;
		// self.count[type] += amount;
	// };
	// this.addBonus = function (bonus) {
		// self.bonuses.push(bonus);
		// self.count.victoryPoints += 2;
	// };
	// this.removeBonus = function (bonus) {
		// self.splice(self.bonuses.indexOf(bonus), 1);
		// self.count.victoryPoints -= 2;
	// };
	// this.addPort = function (port) {
		// self.ports.push(port);
	// };
	// this.addPiece = function (piece) {
		// var plural = base.string.pluralize(piece.type);
		// self[plural].push(piece);
		// if (piece.type == 'settlement' || piece.type == 'city') {
			// self.count.victoryPoints += 1;
		// }
	// };
// };

Player = Ember.Object.extend({
	//
	//	Instance variables
	//
	id: null,
	color: null,
	name: null,
	// Base resources
	grain: 0,
	ore: 0,
	brick: 0,
	wood: 0,
	wool: 0,
	// Base development cards
	knight: 0,
	plenty: 0,
	monopoly: 0,
	roadBuild: 0,
	victory: 0,
	// Game pieces
	ports: [],
	bonuses: [],
	settlements: [],
	roads: [],
	cities: [],
	victoryPoints: 0,
	
	//
	//	Computed properties
	// 
	achievements: function () {
		return this.get('bonuses').join(' ');
	}.property('bonuses'),
	
	// resourceCount:  function () {
		// return this.get('grain') + this.get('ore') + this.get('brick') + this.get('wood') + this.get('wool');
	// }.property('grain', 'ore', 'brick', 'wood', 'wool'),
	
	// developmentCount: function () {
		// return this.get('knight') + this.get('plenty') + this.get('monopoly') + this.get('roadBuild') + this.get('victory');
	// }.property('knight', 'plenty', 'monopoly', 'roadBuild', 'victory'),
	
	resources: function () {
		return {
			grain: this.get('grain'),
			ore: this.get('ore'),
			brick: this.get('brick'),
			wood: this.get('wood'),
			wool: this.get('wool')
		};
	}.property('grain', 'ore', 'brick', 'wood', 'wool'),
	
	developmentCards: function () {
		return {
			knight: this.get('knight'),
			plenty: this.get('plenty'),
			monopoly: this.get('monopoly'),
			roadBuild: this.get('roadBuild'),
			victory: this.get('victory')
		};
	}.property('knight', 'plenty', 'monopoly', 'roadBuild', 'victory'),
	
	//
	//	Observers
	//
	// Watch for changes to computed properties and pass the update to the server
	resourceCountChanged: function () {
		Controller.update({
			dest: 'client',
			type: 'playerState', 
			data: {
				player: this.get('id'),
				property: 'resourceCount',
				value: this.get('resourceCount')
			}
		});
	}.observes('resourceCount'),
	
	developmentCountChanged: function () {
		Controller.update({ 
			dest: 'client',
			type: 'playerState', 
			data: {
				player: this.get('id'),
				property: 'developmentCount', 
				value: this.get('developmentCount') 
			} 
		});
	}.observes('developmentCount'),
	
	victoryPointsChanged: function () {
		Controller.update({ 
			dest: 'client',
			type: 'playerState', 
			data: { 
				player: this.get('id'),
				property: 'victoryPoints', 
				value: this.get('victoryPoints') 
			} 
		});
	}.observes('victoryPoints'),
	
	//
	//	Constructor
	//
	init: function () {
		this._super();
		
		if (this.get('isSelf')) {
			this.reopen({
				resourceCount: function () {
					return this.get('grain') + this.get('ore') + this.get('brick') + this.get('wood') + this.get('wool');
				}.property('wood', 'wool', 'ore', 'brick', 'grain'),
				
				developmentCount: function () {
					return this.get('knight') + this.get('plenty') + this.get('monopoly') + this.get('roadBuild') + this.get('victory');
				}.property('knight', 'plenty', 'monopoly', 'roadBuild', 'victory')
			});
		} else {
			this.reopen({
				resourceCount: 0,
				developmentCount: 0
			});
		}
		// this.set('resourceCount', Ember.computed(function () {
			// return this.get('grain') + this.get('ore') + this.get('brick') + this.get('wood') + this.get('wool');
		// }).property('wood', 'wool', 'ore', 'brick', 'grain'));
		
		// this.set('developmentCount', Ember.computed(function () {
			// return this.get('knight') + this.get('plenty') + this.get('monopoly') + this.get('roadBuild') + this.get('victory');
		// }).property('knight', 'plenty', 'monopoly', 'roadBuild', 'victory'));
	},
	
	//
	//	Instance methods
	//
	addPort: function (port) {
		this.get('ports').push(port);
	},
	
	addPiece: function (piece) {
		var plural = base.string.pluralize(piece.type);
		this.get(plural).push(piece);
		if (piece.type == 'settlement' || piece.type == 'city') {
			this.incrementProperty('victoryPoints', 1);
		}
	},
	
	getState: function () {
		var count = this.get('count');
		return { 
			id: this.get('id'), 
			name: this.get('name'), 
			color: this.get('color'),
			achievements: this.get('bonuses').join(' '),
			resourceCount: this.get('resourceCount'),
			developmentCount: this.get('developmentCount'),
			victoryPoints: this.get('victoryPoints')
		};
	},
	
	startTurn: function () {
		Controller.request(['build', 'useCard', 'chat', 'trade', 'tradeResponse', 'endTurn']);
	},
	
	endTurn: function () {
		Controller.release('build');
		Controller.release('useCard');
		Controller.release('trade');
		Controller.release('endTurn');
	},
	
	canBuild: function () {
		var resources = this.get('resources'),
			cost = Game.get('cost')[piece];
		return base.validate(cost, function (amt, type) {
			return amt <= resources[type];
		});
	},
	
	build: function (piece) {
		// Check resource cost of piece
		if (this.canBuild(piece)) {
			var callback = function (pos) {
				Board.validatePlacement(piece, pos) ? Board.place(piece, pos) : Game.popup({ error: 'InvalidPlacement' });
			};
			piece != 'development' ? Controller.activate('place', callback) : this.drawCard();
		}
	},
	
	drawCard: function () {
		var self = this;
		Controller.fire('draw', 'none', function (card) {
			var hasCard = self.get(card) > 0;
			// var view = Game.get('views').developmentCards;
			this.incrementProperty(card, 1);
			// self.update('developmentCards', card, 1);
			// Create the dom view of the card
			// hasCard ? view.update() : view.create([{ name: card, fullName: Game.get('cardNames')[card] }]);
			Controller.on('useCard', $('#development .items a'), 'click', function () { }, 'game');
		});
	},
	
	useCard: function (card) {
		if (this.get(card) != 0) {
			// var view = Game.get('views').developmentCards;
			Game.useCard(card);
			this.incrementProperty(card, -1);
			// this.update('developmentCards', card, -1);
			// view.update();
		}
	},
	
	updateResources: function (resources) {
		var self = this;
		base.each(resources, function (amt, type) {
			self.incrementProperty(type, amt);
			// self.update('resources', type, amt);
		});
		var resourceView = Game.get('views').resources;
	}
});

// Prototype methods --------------------------------------------------------
// --------------------------------------------------------------------------
/*
Player.prototype.getState = function () {
	var count = this.get('count');
	return { 
		id: this.get('id'), 
		name: this.get('name'), 
		color: this.get('color'),
		achievements: this.get('bonuses').join(' '),
		resourceCount: count.resources,
		developmentCount: count.developmentCards,
		victoryPoints: count.victoryPoints
	};
};
Player.prototype.startTurn = function () {
	// Turn on control actions
	Controller.request(['build', 'useCard', 'chat', 'trade', 'tradeResponse', 'endTurn']);
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

*/