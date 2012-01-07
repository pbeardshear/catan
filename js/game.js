//
//	game.js
//

var Game = (function () {
	// Global state variables
	var players = [],
		settlements = [],
		roads = [];
		
	// Turn variables
	var placing = false;
	
	// Private classes
	function Road (o) {
		var start = null,
			end = null;
		this.type = 'edge';
	}
	
	Road.prototype.draw = function (start, end) {
		
	};
	
	function Settlement (o) {
		var pos = o.pos;
		this.type = 'vertex';
	}
	
	Settlement.prototype.draw = function (pos) {
	
	};
	
	function City (o) {
		var pos = o.pos;
		this.type = 'vertex';
	}
	
	City.prototype.draw = function (pos) {
		
	};
		
	return {
		// Setup the game
		init: function (socket, data) {
			socket.emit('startGame', { data: JSON.stringify({ }) });
		},
		// Add a new game piece (road, settlement) to the board
		place: function (o) {
			placing = true;
			// Show the available locations
			Engine.highlightAvailable(o.type);
			Engine.placeObject(o, function () {
				// Kind of a misnomer, the user placed an object, so lets rollback
				// the state to not placing anything
				this.cancel();
			}, this);
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