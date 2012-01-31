//
//	board.js
//

var Board = (function () {
	// Constants
	// ---------------------------------------------------------------------------------------------------------
	var CONST = app.CONST,
		height = CONST.board.height,
		width = CONST.board.width,
		numResources = CONST.game.numTypes,
		numTiles = CONST.game.numTiles;
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var swapTile = null,
		tiles = [],
		ports = [],
		boardSize = 0;
		
	var robberTile = null;
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	// Ports are considered tiles internally,
	// and have one edge (two adjacent vertices) which is considered active (i.e. gives access to the port)
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
	Tile.prototype.adjacent = function (pos) {
		return Engine.pointDistance(Engine.getCoords(this.id), pos) <= 50;
	};
	
	// Game piece classes
	var pieces = {
		road: Road,
		settlement: Settlement,
		city: City
	};
	
	function Road (o) {
		this.start = o.pos.start;
		this.end = o.pos.end;
		this.owner = o.owner;
		this.type = 'road';
	}
	Road.type = 'road';
	Road.prototype.draw = function () {
		Engine.draw(this, 'road');
	};
	
	function Settlement (o) {
		this.pos = o.pos;
		this.owner = o.owner;
		this.type = 'settlement';
	}
	Settlement.type = 'settlement';
	Settlement.prototype.draw = function () {
		Engine.draw(this, 'settlement');
	};
	
	function City (o) {
		this.pos = o.pos;
		this.owner = o.owner;
		this.type = 'city';
	}
	City.type = 'city';
	City.prototype.draw = function () {
		Engine.draw(this, 'city');
	};
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	// Generate the resources for this board size
	function generateResources (size) {
		var tiles = [],
			countLarge = Math.ceil(numTiles/numResources),
			countSmall = Math.floor(numTiles/numResources);
		for (var i = 0; i < size - 2; i++) {
			tiles.push('desert');
		}
		for (var i = 0; i < countLarge; i++) {
			tiles.push('grain');
			tiles.push('wood');
			tiles.push('wool');
		}
		for (var i = 0; i < countSmall; i++) {
			tiles.push('ore');
			tiles.push('brick');
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
	
	function getPieces (type) {
		var pieces = [],
			players = Game.get('players'),
			plural = base.string.pluralize(type);
		for (var i = 0; i < players.length; i++) {
			pieces = pieces.concat(players[i].get(plural));
		}
		return pieces;
	}
	
	// Placement validation functions
	// Returns true if the position is empty, otherwise returns the object at that position
	function empty (type, pos) {
		var pieces = getPieces(type);
		for (var i = 0; i < pieces.length; i++) {
			if (pieces[i].isAt(pos)) {
				return pieces[i];
			}
		}
		return true;
	}
	
	// Returns true if there is a road owned by the current player adjacent to the passed position
	function adjacentRoad (pos) {
		var pieces = getPieces('road');
		var player = Game.get('self');
		for (var i = 0; i < pieces.length; i++) {
			if (player.id == pieces[i].owner.id && pieces[i].isAt(pos)) {
				return true;
			}
		}
		return false;
	}
	
	// Returns true if there is a settlement adjacent to the passed position
	// Adjacent in this case means two adjacent vertices
	function adjacentSettlement (pos) {
		var settlements = getPieces('settlement'),
			cities = getPieces('city');
		for (var i = 0; i < settlements; i++) {
			if (Engine.pointDist(settlements[i].pos, pos) <= 50) {
				return true;
			}
		}
		for (var i = 0; i < cities.length; i++) {
			if (Engine.pointDist(cities[i].pos, pos) <= 50) {
				return true;
			}
		}
		return false;
	}
	
	// Set the placement area that should be active
	// Valid types are 'center', 'edge', 'vertex', and 'none'
	function placeState (type) {
		var id = type === 'none' ? '' : '#board-' + type;
		Engine.setActiveMap(id);
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		// Initialize the board state, and draw it to the canvas
		init: function (size) {
			if (typeof size == 'number') {
				boardSize = size;
				var types = generateResources(size),
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
			} else if (typeof size == 'object') {
				// Whole board was passed to us, we need to set up the state
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
			// Generate events for board interaction
			Controller.on('placeCenter', $('#board-center area'), 'click', this.place, 'pregame');
			Controller.on('placeVertex', $('#board-vertex area'), 'click', this.place, 'game');
			Controller.on('placeEdge', $('#board-edge area'), 'click', this.place, 'game');
			return { tiles: tiles, ports: ports };
		},
		getTile: function (index, type) {
			if (typeof index == 'number') {
				return type == 'tile' ? Engine.getCoords(index) : Engine.getCoords(index, boardSize+1);
			} else {
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
		harvestResources: function (player, roll) {
			// Get the player's settlements and cities
			var settlements = player.get('settlements');
			var cities = player.get('cities');
			
			var resources = { grain: 0, ore: 0, wood: 0, wool: 0, brick: 0 };
			base.each(base.filter(tiles, function (tile) { return tile.quality == roll; }), function (tile) {
				// Check if any of the settlements or cities are adjacent to a matched tile
				base.each(settlements, function (settlement) {
					if (tile.adjacent(settlement.pos)) {
						resources[tile.type] += 1;
					}
				});
				
				base.each(cities, function (city) {
					if (tile.adjacent(city.pos)) {
						resources[tile.type] += 2;
					}
				});
			});
			player.addResources(resources);
		},
		validate: function (a, b, type) {
			return type == 'port' ? Engine.pointDistance(a, b) == 0 : Engine.pointDistance(a, b) <= 50;
		},
		validatePlacement: function (type, pos) {
			// Road - no road there + adjacent to current road
			// Settlement - no settlement/city there + adjacent to current road + no settlement/city at adjacent vertex
			// City - current settlement there
			var isEmpty = empty(type, pos);
			return type == 'road' ? isEmpty && (adjacentRoad(pos.start) || adjacentRoad(pos.end)) :
				   type == 'settlement' ? isEmpty && adjacentRoad(pos) && !adjacentSettlement(pos) :
				   type == 'city' ? isEmpty && isEmpty.owner == Game.self && isEmpty.type == 'settlement' : false;
		},
		beginPlace: function (player, type, forcePlacement, callback) {
			var positionMap = { road: 'Edge', settlement: 'Vertex', city: 'Vertex' };
			Controller.request('place' + positionMap[type]);
			placeState(positionMap[type]);
			this.placing = { player: player, piece: pieces[type], force: forcePlacement || false, callback: callback, action: ('place' + positionMap[type]) };
		},
		place: function (event) {
			var self = Board;
			var coords = this.coords.split(','),
				isRoad = self.placing.piece.type == 'road',
				edgeType = isRoad ? this.attributes['type'].value : null,
				pos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) }
				placement = self.placing;
			if (placement.force || self.validatePlacement(placement.piece.type, pos)) {
				var piece = new placement.piece({ owner: placement.player, pos: isRoad ? Engine.getPosition(pos, edgeType) : pos });
				placement.player.addPiece(piece);
				Engine.draw({ pos: pos, type: edgeType }, placement.piece.type);
				// Update the victory points and such
				Game.update( );
				// Update the other players
				Controller.fire('update', { type: 'build', data: { type: piece } });
				// Do some cleanup
				Controller.release(placement.action);
				placeState('none');
				// Execute the callback, if it exists
				placement.callback && placement.callback();
			} else {
				// Placement is no good
				Game.msg( );
			}
		},
		swapTiles: function (area, i) {
			if (i && typeof area == 'number' && typeof i == 'number') {
				var j = area;
				tiles[i].swap(tiles[j]);
			} else {
				var coords = area.coords;
				if (swapTile != null) {
					var tile = this.getTile(coords);
					swapTile.swap(tile);
					Controller.update({ dest: 'client', type: 'swap', self: false, data: [swapTile.id, tile.id] });
					swapTile = null;
				} else {
					swapTile = this.getTile(coords);
				}
			}
		}
	};
})();

