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
		};
		
	var developmentCards = {
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
		
	// Turn variables
	// ---------------------------------------------------------------------------------------------------------
	var placing = false;
	var trade = null;
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	function Player (o) {
		this.id = o.id;
		this.name = o.name;
		this.resources = [];
		this.developmentCards = [];
		this.ports = [];
	}
	
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
		else {
			// City or settlement
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
	}
	
	// Move the robber
	function moveRobber (tile) {
		robberTile.robber = false;
		tile.robber = true;
		robberTile = tile;
	}
	
	// Add appropriate resources to this players count
	function harvestResources (roll) {
		var out = [];
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
						self.resources.push(out.resource);
					}
				}
			}
		}
		// Do the same over the cities
		for (var m = 0; m < pieces.city.length; m++) {
			if (pieces.city[m].owner.id == self.id) {
				for (var n = 0; n < out.length; n++) {
					if (Board.validate(out[n], pieces.city[m].pos)) {
						self.resources = self.resources.concat([out[n].resource, out[n].resource]);
					}
				}
			}
		}
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
		// Setup the game
		init: function (o) {
			this.turnOrder = null;
			var board = Board.init(app.CONST.board.size);
			tiles = board.tiles;
			ports = board.ports;
			for (var i = 0; i < tiles.length; i++) {
				if (tiles[i].robber) {
					robberTile = tiles[i];
					break;
				}
			}
			self = new Player(o);
			players.push(self);
			
			Controller.changeState('center');
			Controller.activate('swap');
			
			// app.swap('host', 'setup');
			// app.apply('setup', 'player', [o.name]);
		},
		// Add a player to the game
		addPlayer: function (o) {
			players.push(new Player(o));
		},
		// Add a new game piece (road, settlement) to the board
		place: function (o, rep) {
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
						// Kind of a misnomer, the user placed an object, so lets rollback
						// the state to not placing anything
						rep ? this.place(o) : this.cancel({ el: clickable });
						// Controller.deactivate('place');
					}
					else {
						// Alert the user that they chose incorrectly
					}
				}
			});
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
			developmentCards[type]();
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
		// Rollback a previous game operation (place or upgrade)
		cancel: function (o) {
			placing = false;
			Controller.deactivate('place', o);
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