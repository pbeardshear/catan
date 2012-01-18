//
//	board.js
//

var Board = (function () {
	// Constants
	// ---------------------------------------------------------------------------------------------------------
	var CONST = app.CONST,
		height = CONST.height,
		width = CONST.width,
		resources = CONST.game.resources,
		numResources = CONST.game.numTypes,
		numTiles = CONST.game.numTiles;
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var swapTile = null,
		tiles = [],
		boardSize = 0;
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	// Ports are considered tiles internally,
	// and a have one edge which is considered active (i.e. gives access to the port)
	function Port (o) {
		this.type = o.type;		// The type of resource that you can trade at this port
		this.count = o.count;	// The trade ratio at this port (2:1, 3:1)
		this.id = o.id;			// Tile id of this port tile	
		this.pos = o.pos;		// x-y position of the center of this tile
		this.docks = o.docks;	// The two vertices on this tile which give access to the port
		this.valid = o.valid;	// True if this tile actually has a port on it (some "port" tiles are actually just water)
	}
	Port.prototype.draw = function () {
		Engine.draw(this);
	};
	
	function Tile (o) {
		this.id = o.id;			// Tile id (used by rendering engine)
		this.type = o.type;		// The type of resource that this tile produces
		this.quality = o.quality;		// The roll on which this tile will produce resources
		this.robber = o.type == 'desert';	// Boolean flag indicating whether this tiles houses the robber
	}
	Tile.prototype.draw = function () {
		Engine.draw(this, 'tile');
	};
	Tile.prototype.swap = function (tile) {
		var type = this.type,
			quality = this.quality;
			
		this.type = tile.type;
		this.quality = tile.quality;
		tile.type = type;
		tile.quality = quality;
		
		this.draw();
		tile.draw();
	};
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	// Generate the resources for this board size
	function generateResources (types, size) {
		var tiles = [],
			countLarge = Math.ceil(numTiles/numResources),
			countSmall = Math.floor(numTiles/numResources);
		for (var i = 0; i < size - 2; i++) {
			tiles.push(types.desert);
		}
		for (var i = 0; i < countLarge; i++) {
			tiles.push(types.wheat);
			tiles.push(types.wood);
			tiles.push(types.wool);
		}
		for (var i = 0; i < countSmall; i++) {
			tiles.push(types.ore);
			tiles.push(types.brick);
		}
		return tiles;
	}
	
	// Generate the numbers for this board size
	function generateNumbers (size) {
		var numbers = [];
		for (var i = 3; i < 12; i++) {
			for (var j = 0; j < size - 1; j++) {
				numbers.push(i);
			}
		}
		
		for (var i = 0; i < size - 2; i++) {
			numbers.push(2);
			numbers.push(12);
		}
		return numbers;
	}
	
	// Return a random element from the passed array (in place)
	function popRandom (arr) {
		return arr.splice(Math.floor(Math.random()*arr.length), 1)[0];
	}
	
	// Public object
	// ---------------------------------------------------------------------------------------------------------
	return {
		// Initialize the board state, and draw it to the canvas
		init: function (size) {
			boardSize = size;
			var types = generateResources(resources, size),
				numbers = generateNumbers(size);
			// Create all of the tile objects for the board
			for (var i = 0; i < numTiles; i++) {
				var type = popRandom(types);
				tiles.push(new Tile({
					id: i,
					type: type,
					quality: type != 'desert' ? popRandom(numbers) : 0
				}));
			}
			// Draw the tiles
			Engine.generateMap(tiles);
		},
		getTile: function (index, type) {
			if (typeof index == 'number') {
				return type == 'tile' ? Engine.getCoords(index) : Engine.getCoords(index, boardSize+1);
			}
			else {
				var coords = index.split(',');
				return Engine.getTile(coords[0], coords[1]);
			}
		},
		validate: function (a, b, type) {
			return type == 'port' ? Engine.pointDistance(a, b, 0) : Engine.pointDistance(a, b, 1);
		},
		place: function (area, callback, scope) {
			var coords = area.coords.split(','),
				pos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
			callback.call(scope, Engine.getPosition(pos, $(area).attr('type')));
		},
		swapTiles: function (area) {
			var coords = area.coords;
			if (swapTile != null) {
				swapTile.swap(this.getTile(coords));
				swapTile = null;
			}
			else {
				swapTile = this.getTile(coords);
			}
		}
	};
})();

