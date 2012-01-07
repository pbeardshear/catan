//
//	game.js
//

var Game = (function () {
	// Global state variables
	var self = new Player({ id: 0 }),
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
	
	// Private classes
	function Player (o) {
		this.id = o.id;
	}
	
	function Road (o) {
		this.start = o.pos.start;
		this.end = o.pos.end;
		this.type = 'edge';
	}
	
	function Settlement (o) {
		this.pos = o.pos;
		this.type = 'vertex';
	}
	
	function City (o) {
		this.pos = o.pos;
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
		
	return {
		// Setup the game
		init: function (data) { },
		// Add a new game piece (road, settlement) to the board
		place: function (o) {
			placing = true;
			// Show the available locations
			Engine.highlightAvailable(o.type);
			Engine.placeObject(o, function (pos) {
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
			}, this);
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
		startTurn: function () { },
		// Do cleanup
		endTurn: function () { }
	};
})();