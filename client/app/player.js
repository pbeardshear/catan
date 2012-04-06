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
	isTurn: false,
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
	victoryPoints: 0,
	
	//
	//	Computed properties
	// 
	achievements: function () {
		return this.get('bonuses').join(' ');
	}.property('bonuses'),

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
	//	Constructor
	//
	init: function () {
		this._super();
		
		// Set up some properties with objects as values, as Ember will use the same across all instances of the class
		this.set('ports', []);
		this.set('bonuses', []);
		this.set('settlements', []);
		this.set('roads', []);
		this.set('cities', []);
		
		// Set up watchers depending on whether this is the client player or other players
		if (this.get('isSelf')) {
			this.reopen({
				resourceCount: function () {
					return this.get('grain') + this.get('ore') + this.get('brick') + this.get('wood') + this.get('wool');
				}.property('wood', 'wool', 'ore', 'brick', 'grain'),
				
				developmentCount: function () {
					return this.get('knight') + this.get('plenty') + this.get('monopoly') + this.get('roadBuild') + this.get('victory');
				}.property('knight', 'plenty', 'monopoly', 'roadBuild', 'victory'),
				
				//
				//	Observers
				//
				// Watch for changes to computed properties and pass the update to the server
				// Only watch for your own changes
				resourceCountChanged: function () {
					Controller.update({
						dest: 'client',
						self: false,
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
						self: false,
						type: 'playerState', 
						data: {
							player: this.get('id'),
							property: 'developmentCount', 
							value: this.get('developmentCount') 
						} 
					});
				}.observes('developmentCount'),
				
				victoryPointsChanged: function () {
					console.log('victory points changed', this.get('victoryPoints'));
					Controller.update({ 
						dest: 'client',
						self: false,
						type: 'playerState', 
						data: { 
							player: this.get('id'),
							property: 'victoryPoints', 
							value: this.get('victoryPoints') 
						} 
					});
				}.observes('victoryPoints')
			});
		} else {
			this.reopen({
				resourceCount: 0,
				developmentCount: 0
			});
		}
	},
	
	//
	//	Instance methods
	//
	addPort: function (port) {
		this.get('ports').pushObject(port);
	},
	
	addPiece: function (piece) {
		var plural = base.string.pluralize(piece.type);
		this.get(plural).pushObject(piece);
		// TODO: Structure things in a better way so that Player doesn't have to worry if
		// it is the actual client player in order to increment on build
		if (this.isSelf && (piece.type == 'settlement' || piece.type == 'city')) {
			console.log('incrementing victory points');
			this.incrementProperty('victoryPoints', 1);
			// Update the current victory point count on the server
			Controller.update({ dest: 'server', type: 'victoryPoints', data: { inc: 1 } });
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
	
	canBuild: function (piece) {
		var resources = this.get('resources'),
			cost = Game.get('cost')[piece];
		return base.validate(cost, function (amt, type) {
			return amt <= resources[type];
		});
	},
	
	// Deprecated: This is never actually called
	// Instead, Board.beginPlace and Board.place are called
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
			self.incrementProperty(card, 1);
			// self.update('developmentCards', card, 1);
			// Create the dom view of the card
			// hasCard ? view.update() : view.create([{ name: card, fullName: Game.get('cardNames')[card] }]);
			// Controller.on('useCard', $('#development .items a'), 'click', self.useCard, 'game');
		});
	},
	
	useCard: function (card) {
		if (this.get(card) != 0) {
			// var view = Game.get('views').developmentCards;
			var result = Game.useCard(card);
			// Need to check specifically for false, because some card uses are asynchronous and return undefined, which is falsey
			if (result !== false) {
				this.incrementProperty(card, -1);
			}
		}
	},
	
	updateResources: function (resources) {
		var self = this;
		base.each(resources, function (amt, type) {
			// Ember defaults increment to 1, so since 0 is a falsey value, it will instead increment by 1
			if (amt != 0) {
				self.incrementProperty(type, amt);
			}
		});
	},
	
	// Returns a random resource in this player's possession and removes it from their state
	takeRandom: function () {
		var resources = [];
		base.each(this.get('resources'), function (count, type) {
			for (var i = 0; i < count; i++) {
				resources.push(type);
			}
		});
		return resources[Math.floor(Math.random()*resources.length)] || null;
	},
	
	// Removes all of one type of resource from a player's possession and returns the count
	takeAll: function (resource) {
		var count = this.get(resource);
		this.set(resource, 0);
		return count;
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