//
//	game.js
//

var Game = (function () {
	// Global state variables
	// ---------------------------------------------------------------------------------------------------------
	var self = null,
		tiles = [],
		ports = [],
		robberTile = null,
		players = [],
		pieces = {
			road: [[]],	// Array of arrays, one for each player
			settlement: [],
			city: []
		},
		map = {
			road: Road,
			settlement: Settlement,
			city: City
		},
		costs = {
			road: { brick: 1, wood: 1 },
			settlement: { brick: 1, wood: 1, wheat: 1, wool: 1 },
			city: { ore: 3, wheat: 2 },
			developmentCard: { wheat: 1, ore: 1, wool: 1 }
		}
	
	
	// Function collections
	// ---------------------------------------------------------------------------------------------------------
	var developmentCards = {
		displayName: { knight: 'Knight', plenty: 'Year of Plenty', monopoly: 'Monopoly', roadBuild: 'Road Building', victory: 'Victory Points' },
		knight: function () {
			Controller.changeState('center');
			Controller.activate('moveRobber', {
				callback: function (i) {
					moveRobber(tiles[i]);
					// TODO:
					// Steal from someone next to the tile
					Game.popup({ template: app.CONST.ID.steal });
				}
			});
		},
		plenty: function () {
			// Prompt the user to choose two resources
			Game.popup({ template: app.CONST.ID.plenty });
		},
		monopoly: function () {
			// Prompt the user to select a resource type
			Game.popup({ template: app.CONST.ID.monopoly });
		},
		roadBuild: function () {
			Game.popup({ text: 'Place two roads' });
			// Prompt the user to choose two locations
			Game.place({ type: 'road'}, 1);
		},
		victory: function () {
			// Prompt the user that victory cards are not playable
			Game.popup({ text: 'Victory point cards are not playable' });
		}
	};
	
	var updateState = {
		// Get the board state from the server (used when a new player joins a game)
		board: function (data) {
			var board = Board.init(data.board);
			tiles = board.tiles;
			ports = board.ports;
		},
		// Update the state of the board when the host makes a change
		swap: function (data) {
			Board.swapTiles(data[0], data[1]);
		},
		place: function (data) {
			Game.addPiece(data.pos, data.type, data.id);
		},
		display: function (data) {
			var player = players[data.id],
				bonuses = player.bonuses.join(' ');
			player.count[data.item] += data.amount;
			app.update('status', { type: ['overwrite'], which: player.color, data: [player.name, data.achievement || bonuses, player.count.resources, player.count.cards, player.count.victoryPoints] });
		},
	};
	
	// Turn variables
	// ---------------------------------------------------------------------------------------------------------
	var placing = false;
	var trade = null;
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	function Player (o) {
		this.id = o.id;
		this.name = o.name;
		this.resources = {};
		this.bonuses = [];
		this.developmentCards = {
			knight: 0,
			plenty: 0,
			monopoly: 0,
			roadBuild: 0,
			victory: 0
		};
		this.count = {
			resources: 0,
			cards: 0,
			victoryPoints: 0
		};
		this.ports = [];
	}
	
	Player.prototype.canBuild = function (piece) {
		var cost = costs[piece];
		for (var resource in cost) {
			if (cost.hasOwnProperty(resource)) {
				if (this.resources[resource].count < cost[resource]) {
					return false;
				}
			}
		}
		return true;
	};
	
	Player.prototype.deduct = function (cost) {
		var payment = {};
		for (var resource in cost) {
			if (cost.hasOwnProperty(resource)) {
				this.resources[resource] -= cost[resource];
				this.count.resources -= cost[resource];
				payment[resource] = -cost[resource];
			}
		}
		app.updateResource(payment);
	};
	
	Player.prototype.drawCard = function (type) {
		this.developmentCards[type] += 1;
		this.count.cards += 1;
		app.update('cards', { type: ['increment', 'append'], which: type, data: [type, developmentCards.displayName[type]] });
	}
	
	Player.prototype.useCard = function (type) {
		if (this.developmentCards[type] != 0) {
			developmentCards[type]();
			this.developmentCards[type] -= 1;
			this.count.cards -= 1;
			app.update('cards', { type: ['decrement', 'remove'], which: type });
		}
	};
	
	function Road (o) {
		this.start = o.pos.start;
		this.end = o.pos.end;
		this.owner = o.owner;
		this.type = 'edge';
	}
	
	function Settlement (o) {
		this.pos = o.pos;
		this.owner = o.owner;
		this.type = 'vertex';
	}
	
	function City (o) {
		this.pos = o.pos;
		this.owner = o.owner;
		this.type = 'vertex';
	}
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	function validate (pos, type) {
		// DEBUG
		return true;
		var round = Math.round;
		if (type == 'road') {
			return true;
			// Validation: user has a road with a start or end point at pos.start or pos.end
			var p = pieces.road[self.id];
			for (var i = 0; i < p.length; i++) {
				if ((round(p[i].end.x) == round(pos.start.x) && round(p[i].end.y) == round(pos.start.y)) || 
					(round(p[i].start.x) == round(pos.end.x) && round(p[i].start.y) == round(pos.end.y))) {
					return true;
				}
			}
			console.log('failed validation');
			return false;
		}
		else if (type == 'settlement') {
			// Validation:
			// User has a road whose start or end point is at pos, and
			// No settlements exist only one edge away
			var r = pieces.road[self.id],
				s = pieces.settlement,
				c = pieces.city;
			for (var i = 0; i < r.length; i++) {
				if ((round(r[i].start.x) == round(pos.x) && round(r[i].start.y) == round(pos.y)) || 
					(round(r[i].end.x) == round(pos.x) && round(r[i].end.y) == round(pos.y))) {
					// Validate settlement proximity location
					for (var j = 0; j < s.length; j++) {
						if (!Board.validate(pos, s[j].pos)) {
							console.log('failed validation 2');
							return false;
						}
					}
					
					for (var k = 0; k < c.length; k++) {
						if (!Board.validate(pos, c[k].pos)) {
							console.log('failed validation 3');
							return false;
						}
					}
					return true;
				}
			}
			console.log('failed validation 1');
			return false;
		}
		else if (type == 'city') {
			// Validation:
			// On a location currently occupied by a settlement owned by the player
			var s = pieces.settlement;
			for (var i = 0; i < s.length; i++) {
				if (round(s[i].pos.x) == round(pos.x) && round(s[i].pos.y) == round(pos.y)) {
					return true;
				}
			}
			console.log('failed validation for city');
			return false;
		}
		else {
			console.error('Invalid type', type, 'passed to validation');
		}
	}
	
	// Move the robber
	function moveRobber (tile) {
		robberTile.robber = false;
		tile.robber = true;
		robberTile = tile;
	}
	
	// Add appropriate resources to this players count
	function harvestResources (roll) {
		var out = [],
			count = 0;
		// Compile a list of all tiles outputting resources for this roll
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].quality == roll) {
				var tile = Board.getTile(i, 'tile');
				tile.resource = tiles[i].type;
				out.push(tile);
			}
		}
		
		// Iterate over this player's settlements, and check if any of them are adjacent
		for (var j = 0; j < pieces.settlement.length; j++) {
			if (pieces.settlement[j].owner.id == self.id) {
				for (var k = 0; k < out.length; k++) {
					if (Board.validate(out[i], pieces.settlement[j].pos)) {
						self.resources[out[i].resource] += 1;
						count += 1;
					}
				}
			}
		}
		// Do the same over the cities
		for (var m = 0; m < pieces.city.length; m++) {
			if (pieces.city[m].owner.id == self.id) {
				for (var n = 0; n < out.length; n++) {
					if (Board.validate(out[n], pieces.city[m].pos)) {
						self.resources[out[n].resource] += 2;
						count += 2;
					}
				}
			}
		}
		Controller.update({ dest: 'client', type: 'display', data: { id: self.id, item: 'resources', amount: count });
	}
	
	// Adds access to a port if the object is adjacent to a port
	// TODO:
	// Move and fix, this is pure nastiness
	function tryPort (o) {
		// DEBUG
		console.log(ports);
		console.log('object', o);
		for (var i = 0; i < ports.length; i++) {
			if (ports[i].hasPort) {
				var pos = Board.getTile(ports[i].id, 'port'),
					points = ports[i].validPoints;
				var cos = Math.cos, sin = Math.sin, pi = Math.PI;
				var a = [{ x: pos.x + cos(points[0]*pi/3 - pi/6)*app.CONST.board.landSize, y: pos.y + sin(points[0]*pi/3 - pi/6)*app.CONST.board.landSize },
						 { x: pos.x + cos(points[1]*pi/3 - pi/6)*app.CONST.board.landSize, y: pos.y + sin(points[1]*pi/3 - pi/6)*app.CONST.board.landSize }];
				console.log(ports[i], 'pos', pos, 'bottom', a[0], 'top', a[1]);
				if (Board.validate(a[0], o.pos, 'port') || Board.validate(a[1], o.pos, 'port')) {
					self.ports.push(ports[i]);
					// No settlement can be adjacent to two ports, so we can end early
					break;
				}
			}
		}
		// DEBUG
		console.log(self.ports);
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		// Initialize game state
		init: function (o) {
			this.turnOrder = null;
			var playerList = o.playerList;
			for (var i = 0; i < playerList.length; i++) {
				var player = new Player({ id: playerList[i].id, name: playerList[i].name });
				players[player.id] = player;
				app.update('player', { type: 'append', data: [playerList[i].name] });
				if (playerList[i].id == o.id) {
					self = player;
				}
			}
			app.transition({ from: 'host', to: 'setup' });
		},
		// Sets up functionality allowing the host to set up the game preferences
		setup: function () {
			var board = Board.init(app.CONST.board.size);
			tiles = board.tiles;
			ports = board.ports;
			// The the current position of the robber
			for (var i = 0; i < tiles.length; i++) {
				if (tiles[i].robber) {
					robberTile = tiles[i];
					break;
				}
			}
			Controller.changeState('center');
			Controller.activate('swap');
			Controller.activate('start');
		},
		// Add a player to the game
		addPlayer: function (o) {
			players[o.id] = new Player(o);
			app.update('player', { type: 'append', data: [o.name] });
		},
		// Add a new game piece (road, settlement) to the board
		place: function (o, rep, force) {
			// Check that the player has enough resources to build the piece
			if (self.canBuild(o.type) || force) {
				if (o.type != 'development') {
					var placementMap = { road: 'edge', settlement: 'vertex', city: 'vertex' },
						clickable = '#board-' + placementMap[o.type] + ' area';
					placing = true;
					Controller.changeState(placementMap[o.type]);
					Controller.activate('place', {
						el: clickable,
						type: o.type,
						scope: this,
						callback: function (pos) {
							// Validate the placement
							if (validate(pos, o.type)) {
								this.addPiece(pos, o.type, self.id);
								// Remove the resources from the player
								if (!force) {
									self.deduct(costs[o.type]);
								}
								if (o.type == 'settlement' || o.type == 'city') {
									this.count.victoryPoints += 1;
									Controller.update({ dest: 'client', type: 'display', data: { id: self.id, item: 'victoryPoints', amount: 1 });
								}
								// Kind of a misnomer, the user placed an object, so lets rollback
								// the state to not placing anything
								rep ? this.place(o) : this.cancel({ el: clickable });
								// Controller.deactivate('place');
							}
							else {
								// Alert the user that they chose incorrectly
								app.popup({ text: 'Invalid location for placement' });
							}
						}
					});
				}
				else {
					// Get a development card from the server
					Controller.go('draw', {}, function (card) {
						self.drawCard(card);
					});
				}
			}
			else {
				// Alert the user that they don't have enough resources
				app.popup({ text: 'You don\'t have enough resources to build that' });
			}
		},
		// Add a game piece under the control of the player with the given id
		addPiece: function (pos, type, id) {
			if (type == 'road') {
				pieces[type][id].push(new Road({ pos: pos, owner: players[id] }));
			}
			else {
				var piece = new map[type]({ pos: pos, owner: players[id] });
				pieces[type].push(piece);
				// Checks if the placed piece gives the current player access to a port
				tryPort(piece);
			}
			Engine.drawObject(pos, type);
		},
		useCard: function (type) {
			self.useCard(type);
		},
		popup: function (data) {
			if (data.template) {
				$(data.template).show();
				// Activate the controller necessary
			}
			else if (data.text) {
				$(app.CONST.ID.notice).text(data.text);
			}
		},
		// Replace a settlement with a city
		upgrade: function (o) { },
		// Update the state of the game
		update: function (o) {
			updateState[o.type](o.data);
		},
		// Rollback a previous game operation (place or upgrade)
		cancel: function (o) {
			placing = false;
			Controller.deactivate('place', o);
		},
		start: function (o) {
			this.turnOrder = o.turnOrder;
			app.transition({ from: 'setup', to: 'game' });
			
			Controller.deactivate('swap');
			Controller.deactivate('start');
		},
		// Initialize the game state and view for the beginning of this player's turn
		startTurn: function (o) {
			// Check if this user gets any resources from the dice roll
			harvestResources(o.roll);
			// Check if it is the current player's turn
			if (this.turnOrder[o.turn] == self.id) {
				// Turn on allowable functions on your turn
				Controller.activate('build');
				Controller.activate('useCard');
				Controller.activate('trade');
				Controller.activate('tradeRequest');
				Controller.activate('endTurn');
			}
		},
		// Do cleanup
		endTurn: function (o) {
			// Disallow actions when your turn is over
			if (o && this.turnOrder[o.turn] == self.id) {
				Controller.activate('build');
			}
			else {
				Controller.deactivate('build');
				Controller.deactivate('useCard');
				Controller.deactivate('trade');
				Controller.deactivate('tradeRequest');
			}			
		},
		startTrade: function (data) {
			var popup = $('#tradeConfirmPopup'),
				template = '<li class="{0}"><input type="text" value="{1}" /><label>{2}</label></li>',
				give = "",
				take = "";
			$.each(data.give, function (o) {
				give += template.replace('{0}', o.type).replace('{1}', o.amount).replace('{2}', o.type);
			});
			$.each(data.take, function (o) {
				take += template.replace('{0}', o.type).replace('{1}', o.amount).replace('{2}', o.type);
			});
			trade = data;
			$('#tradeConfirmPopup .first .resources').append(take);
			$('#tradeConfirmPopup .last .resources').append(give);
			$('#tradeConfirmPopup').show();
			Controller.activate('tradeConfirm');
		},
		acceptTrade: function () {
			// TODO:
			// Validate that the user has enough resources to make the trade
			// Give the resources to this player and alert the server
			// that the trade was accepted
			for (var i = 0; i < trade.give.length; i++) {
				var resources = [];
				for (var j = 0; j < trade.give[i].amount; j++) {
					resources.push(trade.give[i].type);
				}
				self.resources.concat(resources);
			}
			
			// Remove the resources this player traded away
			for (var k = 0; k < trade.take.length; k++) {
				for (var m = 0; m < trade.take[k].amount; m++) {
					self.resources.splice(self.resources.indexOf(trade.take[k].type), 1);
				}
			}
			Controller.go('tradeRequest', { accepted: true });
		},
		denyTrade: function () {
			// Tell the server that the trade was canceled
			Controller.go('tradeRequest', { accepted: false });
		},
		finishTrade: function () {
			trade = null;
			Controller.deactivate('tradeRequest');
			Controller.deactivate('tradeConfirm');
		}
	};
})();