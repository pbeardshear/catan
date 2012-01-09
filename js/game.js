//
//	game.js
//

var Game = (function () {
	// Global state variables
	var self = new Player({ id: 0 }),
		tiles = [],
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
		
	// Turn variables
	var placing = false;
	var trade = null;
	
	// Private classes
	function Player (o) {
		this.id = o.id;
		this.resources = [];
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
	function validate (pos, type) {
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
						if (Engine.separation(pos, s[j].pos, 1)) {
							console.log('failed validation 2');
							return false;
						}
					}
					
					for (var k = 0; k < c.length; k++) {
						if (Engine.separation(pos, c[k].pos, 1)) {
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
				var tile = Engine.getTilePosition(i);
				tile.resource = tiles[i].type;
				out.push(tile);
			}
		}
		
		// Iterate over this player's settlements, and check if any of them are adjacent
		for (var j = 0; j < pieces.settlement.length; j++) {
			if (pieces.settlement[j].owner.id == self.id) {
				for (var k = 0; k < out.length; k++) {
					if (Engine.separation(out[i], pieces.settlement[j].pos, 1)) {
						self.resources.push(out.resource);
					}
				}
			}
		}
		// Do the same over the cities
		for (var m = 0; m < pieces.city.length; m++) {
			if (pieces.city[m].owner.id == self.id) {
				for (var n = 0; n < out.length; n++) {
					if (Engine.separation(out[n], pieces.city[m].pos, 1)) {
						self.resources = self.resources.concat([out[n].resource, out[n].resource]);
					}
				}
			}
		}
	}
	
	function useDevelopmentCard (card) {
		
	}
		
	return {
		// Setup the game
		init: function (data) {
			tiles = Engine.generateMap();
			for (var i = 0; i < tiles.length; i++) {
				if (tiles[i].robber) {
					robberTile = tiles[i];
					break;
				}
			}
		},
		// Add a new game piece (road, settlement) to the board
		place: function (o) {
			var placementMap = { road: 'edge', settlement: 'vertex', city: 'vertex' };
			placing = true;
			// Show the available locations
			Engine.highlightAvailable(o.type);
			Controller.activate('place', {
				el: '#board-' + placementMap[o.type] + ' area',
				type: o.type,
				state: placementMap[o.type],
				callback: (function (pos) {
					// Validate the placement
					if (validate(pos, o.type)) {
						this.addPiece(pos, o.type, self.id);
						// Kind of a misnomer, the user placed an object, so lets rollback
						// the state to not placing anything
						this.cancel();
					}
					else {
						// Alert the user that they chose incorrectly
					}
				}).createDelegate(this)
			});
		},
		// Add a game piece under the control of the player with the given id
		addPiece: function (pos, type, id) {
			if (type == 'road') {
				pieces[type][id].push(new Road({ pos: pos, owner: players[id] }));
			}
			else {
				pieces[type].push(new map[type]({ pos: pos, owner: players[id] }));
			}
			Engine.drawObject(pos, type);
		},
		// Replace a settlement with a city
		upgrade: function (o) { },
		// Rollback a previous game operation (place or upgrade)
		cancel: function () {
			placing = false;
			Engine.cleanup();
		},
		// Initialize the game state and view for the beginning of this player's turn
		startTurn: function () {
			// Turn on allowable functions on your turn
			Controller.activate('build');
			Controller.activate('useCard');
			Controller.activate('trade');
			Controller.activate('tradeRequest');
		},
		// Do cleanup
		endTurn: function () {
			// Disallow actions when your turn is over
			Controller.deactivate('build');
			Controller.deactivate('useCard');
			Controller.deactivate('trade');
			Controller.deactivate('tradeRequest');
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