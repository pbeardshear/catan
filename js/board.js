//
//	board.js
//

var Board = (function () {
	// Constants
	// ---------------------------------------------------------------------------------------------------------
	var CONST = app.CONST,
		height = CONST.board.height,
		width = CONST.board.width,
		resources = CONST.game.resources,
		numResources = CONST.game.numTypes,
		numTiles = CONST.game.numTiles;
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var swapTile = null,
		tiles = [],
		ports = [],
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
		Engine.draw(this, 'port');
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
			tiles.push(types.grain);
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
	
	// Generate the tile ids that will be used by the ports
	function generatePorts (size) {
		var outer = size+1,
			edges = size-1,
			ports = [],
			extras = [];	// Clever storage, used to store ids that we will need when wrapping back around
		// Add tiles in a clockwise order
		// Top-most tiles
		for (var i = 0; i < outer; i++) {
			ports.push(i);
		}
		// Right tiles
		var offset = size;
		extras.push(offset+1);
		for (var i = 0; i < edges; i++) {
			ports.push(offset + outer + 1 + i);
			offset += outer + 1 + i;
			extras.push(offset+1);
		}
		// Middle tile
		offset += size*2 + 1;
		ports.push(offset);
		extras.push(offset+1);
		// Lower right side
		for (var i = edges - 1; i >= 0; i--) {
			ports.push(offset + outer + 1 + i);
			offset += outer + 1 + i;
			if (i) {
				extras.push(offset+1);
			}
		}
		// Bottom tiles
		// Easier to add them in order then reverse the array
		var temp = [];
		// offset += 1;
		for (var i = 0; i < outer; i++) {
			offset += 1;
			temp.push(offset);
		}
		ports = ports.concat(temp.reverse());
		// Left side
		ports = ports.concat(extras.reverse());
		return ports;
	}
	
	// Generate the edge types that each port tile will have its ports on
	function generatePortLocations (ports) {
		var origin = { x: width/2, y: height/2 },
			tileSize = app.CONST.board.landSize,
			cos = Math.cos,
			sin = Math.sin,
			pi = Math.PI,
			base = pi/6,
			step = pi/3;
		for (var i = 0; i < ports.length; i++) {
			if (ports[i].valid) {
				var pos = ports[i].pos,
					spots = [];
				for (var j = 0; j < 6; j++) {
					var vertex = { x: pos.x + cos(step*j - base)*tileSize, y: pos.y + sin(step*j - base)*tileSize };
					spots.push({ index: j, dist: Engine.pointDistance(vertex, origin), vertex: vertex });
				}
				// Sort the list least to greatest, and take the top two
				spots.sort(function (a, b) {
					return a.dist - b.dist;
				});
				
				// DEBUG
				var ctx = $.dom('#map').getContext('2d');
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.beginPath();
				ctx.fillStyle = '#FFF';
				ctx.arc(origin.x, origin.y, 20, 0, Math.PI*2, false);
				ctx.fillStyle = '#000';
				ctx.arc(pos.x, pos.y, 10, 0, Math.PI*2, false);
				ctx.arc(spots[0].vertex.x, spots[0].vertex.y, 5, 0, Math.PI*2, false);
				ctx.arc(spots[1].vertex.x, spots[1].vertex.y, 5, 0, Math.PI*2, false);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
				
				ports[i].docks = [spots[0].index, spots[1].index];
			}
		}
	}
	
	// Return a random element from the passed array (in place)
	function popRandom (arr) {
		return arr.splice(Math.floor(Math.random()*arr.length), 1)[0];
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		// Initialize the board state, and draw it to the canvas
		init: function (size) {
			if (typeof size == 'number') {
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
				// Create the ports
				var portTiles = generatePorts(size);
				console.log(portTiles);
				for (var i = 0; i < portTiles.length; i++) {
					ports.push(new Port({
						id: portTiles[i],
						type: 'random',
						pos: this.getTile(portTiles[i], 'port'),
						count: 3,
						valid: (i % 2 != 0)
					}));
				}
				// Add the docks to the ports
				generatePortLocations(ports);
				console.log(ports);
			}
			// Whole board was passed to us, we need to set up the state
			else if (typeof size == 'object') {
				var board = size;
				boardSize = board.size;
				// Create the tile objects
				for (var i = 0; i < board.tiles.length; i++) {
					tiles[board.tiles[i].id] = new Tile(board.tiles[i]);
				}
				for (var i = 0; i < board.ports.length; i++) {
					ports[board.ports[i].id] = new Port(board.ports[i]);
				}
			}
			// Draw the tiles
			Engine.generateMap(tiles);
			return { tiles: tiles, ports: ports };
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
		getState: function () {
			return {
				size: boardSize,
				tiles: tiles,
				ports: ports
			};
		},
		validate: function (a, b, type) {
			return type == 'port' ? Engine.pointDistance(a, b) == 0 : Engine.pointDistance(a, b) <= 50;
		},
		place: function (area, callback, scope) {
			var coords = area.coords.split(','),
				pos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
			callback.call(scope, Engine.getPosition(pos, $(area).attr('type')));
		},
		swapTiles: function (area, i) {
			if (i && typeof area == 'number' && typeof i == 'number') {
				var j = area;
				tiles[i].swap(tiles[j]);
			}
			else {
				var coords = area.coords;
				if (swapTile != null) {
					var tile = this.getTile(coords);
					swapTile.swap(tile);
					Controller.update({ dest: 'client', type: 'swap', self: false, data: [swapTile.id, tile.id] });
					swapTile = null;
				}
				else {
					swapTile = this.getTile(coords);
				}
			}
		}
	};
})();

