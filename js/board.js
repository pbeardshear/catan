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
		
	// Utility methods
	// ---------------------------------------------------------------------------------------------------------
	function round (x, precision) {
		return parseFloat(x.toPrecision(precision));
	}
	
	function shuffle (array) {
		var tmp, current, top = array.length;
		if (top) {
			while (--top) {
				current = Math.floor(Math.random() * (top+1));
				tmp = array[current];
				array[current] = array[top];
				array[top] = tmp;
			}
		}
		return array;
	}
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var swapTile = null,
		tiles = [],
		ports = [],
		boardSize = 0,
		portLocations = {};		// Hash of dock positions -> port id
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	// Ports are considered tiles internally,
	// and have one edge (two adjacent vertices) which is considered active (i.e. gives access to the port)
	var portTypes = [];		// TODO: Do this in a less hard-coded way
	function Port (o) {
		this.type = o.type;		// The type of resource that you can trade at this port
		this.count = o.type && o.type == 'any' ? 3 : 2;		// The trade ratio at this port (2:1, 3:1)
		this.id = o.id;			// Tile id of this port tile	
		this.pos = o.pos;		// x-y position of the center of this tile
		this.docks = o.docks;	// The two vertices on this tile which give access to the port
		this.valid = o.valid;	// True if this tile actually has a port on it (some "port" tiles are actually just water)
	}
	Port.prototype.draw = function () {
		Engine.draw(this, 'port');
	};
	Port.prototype.isAdjacent = function (pos) {
		return this.valid && (Engine.pointDistance(this.docks[0], pos) == 0 || Engine.pointDistance(this.docks[1], pos));
	};
	
	function Tile (o) {
		this.id = o.id;			// Tile id (used by rendering engine)
		this.type = o.type;		// The type of resource that this tile produces
		this.quality = o.quality;		// The roll on which this tile will produce resources
		this.robber = false;	// Boolean flag indicating whether this tiles houses the robber
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
		return Engine.pointDistance(Engine.getCoords(this.id), pos) <= CONST.board.landSize;
	};
	Tile.prototype.qualityMap = {
		2: 1,
		3: 2,
		4: 3,
		5: 4,
		6: 5,
		8: 5,
		9: 4,
		10: 3,
		11: 2,
		12: 1
	};
	
	// Game piece classes
	var pieces = {
		road: Road,
		settlement: Settlement,
		city: City
	};
	
	function Road (o) {
		this.pos = o.pos;
		this.start = o.pos.start;
		this.end = o.pos.end;
		this.owner = o.owner;
		this.edge = o.edge;
		this.type = 'road';
	}
	Road.type = 'road';
	Road.prototype.draw = function () {
		Engine.draw(this, 'road');
	};
	Road.prototype.isAt = function (pos) {
		return (round(pos.x,2) == round(this.start.x,2) && round(pos.y,2) == round(this.start.y,2) 
				|| round(pos.x,2) == round(this.end.x,2) && round(pos.y,2) == round(this.end.y,2));
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
	Settlement.prototype.isAt = function (pos) {
		return round(pos.x,2) == round(this.pos.x,2) && round(pos.y,2) == round(this.pos.y,2);
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
	City.prototype.isAt = function (pos) {
		return round(pos.x,2) == round(this.pos.x,2) && round(pos.y,2) == round(this.pos.y,2);
	};
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	
	// Converts a given point object into a consistently formatted string
	function pointString (point) {
		return [parseInt(point.x), ',', parseInt(point.y)].join('');
	}
	
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
			if (i != 7) {
				for (var j = 0; j < size - 1; j++) {
					numbers.push(i);
				}
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
				ports[i].docks = [spots[0].index, spots[1].index];
				portLocations[pointString(spots[0].vertex)] = ports[i].id;
				portLocations[pointString(spots[1].vertex)] = ports[i].id;
			}
		}
	}
	
	// Returns a port object if one is adjacent to the provided position, otherwise returns null
	function findPort (pos) {
		var id = portLocations[pointString(pos)];
		if (id) {
			return ports.find(function (port) {
				return id == port.id;
			});
		}
		return null;
	}
	
	// Build up the list of port types
	function generatePortTypes () {
		// The breakdown is 1:1 with 3:1 any ports and 2:1 [resource] ports
		var activePortCount = 9;	// Actually count this
		var anyPortCount = Math.floor(activePortCount/2);
		var resourcePortCount = Math.ceil(activePortCount/2);
		for (var i = 0; i < anyPortCount; i++) {
			portTypes.push('any');
		}
		// Break down the resource ports
		var resources = ['brick', 'wood', 'wheat', 'ore', 'wool'];
		for (var i = 0; i < resourcePortCount; i++) {
			portTypes.push(resources[i % 5]);
		}
		// Randomize the port types
		shuffle(portTypes);
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
			if (type == 'road') {
				// For a position to be occupied, both its start and end positions must be taken by this piece
				if (pieces[i].isAt(pos.start) && pieces[i].isAt(pos.end)) {
					return pieces[i];
				}
			}
			else if (pieces[i].isAt(pos)) {
				return pieces[i];
			}
		}
		return true;
	}
	
	// Returns true if either the start or end positions of the road are adjacent to a settlement
	// owned by the current player
	function roadSettlementAdjacent (start, end) {
		var pieces = getPieces('settlement');
		var player = Game.get('self');
		for (var i = 0; i < pieces.length; i++) {
			if (player.get('id') == pieces[i].owner.get('id') && (pieces[i].isAt(start) || pieces[i].isAt(end))) {
				return true;
			}
		}
		return false;
	}
	
	// Returns true if there is a road owned by the current player adjacent to the passed position
	function adjacentRoad (pos) {
		var pieces = getPieces('road');
		var player = Game.get('self');
		for (var i = 0; i < pieces.length; i++) {
			if (player.get('id') == pieces[i].owner.get('id') && pieces[i].isAt(pos)) {
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
		for (var i = 0; i < settlements.length; i++) {
			if (Engine.pointDistance(settlements[i].pos, pos) <= CONST.board.landSize) {
				return true;
			}
		}
		for (var i = 0; i < cities.length; i++) {
			if (Engine.pointDistance(cities[i].pos, pos) <= CONST.board.landSize) {
				return true;
			}
		}
		return false;
	}
	
	// Returns a list of the players that have settlements or cities
	// adjacent to the given tile
	function listAdjacentPlayers (tile) {
		var players = App.Players.toArray(),
			tileCenter = Engine.getCoords(tile.id),
			matchedPlayers = [];
		outer: for (var i = 0; i < players.length; i++) {
			if (players[i] != App.Players.self) {
				var settlements = players[i].settlements,
					cities = players[i].cities;
				for (var j = 0; j < settlements.length; j++) {
					if (Engine.pointDistance(settlements[j].pos, tileCenter) <= CONST.board.landSize) {
						matchedPlayers.push(players[i]);
						continue outer;
					}
				}
				for (var j = 0; j < cities.length; j++) {
					if (Engine.pointDistance(cities[j].pos, tileCenter) <= CONST.board.landSize) {
						matchedPlayers.push(players[i]);
						continue outer;
					}
				}
			}
		}
		return matchedPlayers;
	}
	
	// Set the placement area that should be active
	// Valid types are 'center', 'edge', 'vertex', and 'none'
	// Providing a callback binds a click event to the objects in the new state
	// This callback is only called once, then is discarded
	function placeState (type, callback) {
		var id = type === 'none' ? '' : '#board-' + type;
		Engine.setActiveMap(id);
		// Register the callback
		if (id && callback) {
			$(id + ' area').bind('click', function (e) {
				callback.call(Board, e);
				$(id + ' area').unbind('click');
			});
		}
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		// Board accessor state
		robberTile: null,
		
		// Initialize the board state, and draw it to the canvas
		init: function (size) {
			if (typeof size == 'number') {
				boardSize = size;
				var types = generateResources(size),
					numbers = generateNumbers(size);
				console.log('resource types', types.length);
				console.log('resource values', numbers.length);
				// Create all of the tile objects for the board
				for (var i = 0; i < numTiles; i++) {
					var type = popRandom(types),
						tile = new Tile({
							id: i,
							type: type,
							quality: type != 'desert' ? popRandom(numbers) : 7
						});
					if (type == 'desert') {
						tile.robber = true;
						this.robberTile = tile;
					}
					tiles.push(tile);
				}
				console.log(tiles);
				// Create the ports
				var portTiles = generatePorts(size);
				generatePortTypes();
				console.log(portTiles);
				for (var i = 0; i < portTiles.length; i++) {
					var valid = i % 2 != 0;
					ports.push(new Port({
						id: portTiles[i],
						type: valid ? portTypes.pop() : null,
						pos: this.getTile(portTiles[i], 'port'),
						valid: valid
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
					if (board.tiles[i].robber) {
						this.robberTile = tiles[board.tiles[i].id];
					}
				}
				for (var i = 0; i < board.ports.length; i++) {
					ports[i] = new Port(board.ports[i]);
				}
			}
			// Draw the tiles
			Engine.generateMap(tiles, ports);
			// Generate events for board interaction
			Controller.on('swap', $('#board-center area'), 'click', this.swapTiles, 'pregame');
			placeState('center');
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
			base.each(base.filter(tiles, function (tile) { return tile.quality == roll && !tile.robber; }), function (tile) {
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
			player.updateResources(resources);
		},
		validate: function (a, b, type) {
			return type == 'port' ? Engine.pointDistance(a, b) == 0 : Engine.pointDistance(a, b) <= CONST.board.landSize;
		},
		validatePlacement: function (type, pos, adjusted) {
			// Road - no road there + adjacent to current road
			// Settlement - no settlement/city there + adjacent to current road + no settlement/city at adjacent vertex
			// City - current settlement there
			var isEmpty = empty(type == 'city' ? 'settlement' : type, pos);
			if (!adjusted) {
				return type == 'road' ? isEmpty && (adjacentRoad(pos.start) || adjacentRoad(pos.end)) :
					   type == 'settlement' ? isEmpty && adjacentRoad(pos) && !adjacentSettlement(pos) :
					   type == 'city' ? isEmpty && isEmpty.owner == Game.self && isEmpty.type == 'settlement' : false;
		    } else {
				// This branch is hit during initial placement
				// Valid placements are slightly different in this case
				return type == 'road' ? isEmpty && roadSettlementAdjacent(pos.start, pos.end) :
					   type == 'settlement' ? isEmpty && !adjacentSettlement(pos) : false;
			}
		},
		// Load up the state and request the placement event
		// Assumes that the player has already been checked for resources
		beginPlace: function (player, type, initialPlacement, callback) {
			var positionMap = { road: 'Edge', settlement: 'Vertex', city: 'Vertex' };
			Controller.request('place' + positionMap[type]);
			placeState(positionMap[type]);
			this.placing = { player: player, piece: pieces[type], initial: initialPlacement || false, callback: callback, action: ('place' + positionMap[type]) };
		},
		place: function (event) {
			var self = Board;
			var coords = this.coords.split(','),
				isRoad = self.placing.piece.type == 'road',
				edgeType = isRoad ? this.attributes['type'].value : null,
				pos = Engine.getPosition({ x: parseFloat(coords[0]), y: parseFloat(coords[1]) }, edgeType),
				placement = self.placing;
			if (self.validatePlacement(placement.piece.type, pos, placement.initial)) {
				// Do some cleanup
				Controller.release(placement.action);
				placeState('none');
				// Place the piece on the board
				var options = {
					player: placement.player.get('id'),
					pos: pos,
					edge: edgeType,
					type: placement.piece.type
				};
				var piece = self.placePiece(options);
				Controller.update({ dest: 'client', type: 'build', data: options });
				// Execute the callback, if it exists
				console.log('placement callback', placement.callback);
				placement.callback && placement.callback();
			} else {
				// Placement is no good
				Game.msg('You can\'t place that there!');
			}
		},
		// Actually place the game piece on the board
		// Called by Board.place, and also on placement update from the server (when another player places a piece)
		placePiece: function (options) {
			var player = Game.getPlayer(options.player);
			var piece = new pieces[options.type]({ owner: player, pos: options.pos, edge: options.edge });
			var activePort = options.type == 'settlement' ? findPort(options.pos) : null;
			if (activePort) {
				console.log('got port');
				player.addPort(activePort);
			}
			player.addPiece(piece);
			// Game.update();
			// console.log(piece.pos);
			Engine.draw({ pos: piece.pos, type: piece.edge || null }, piece.type, [player.get('color')]);
			return piece;
		},
		swapTiles: function (event, i) {
			if (i && typeof event == 'number' && typeof i == 'number') {
				var j = event;
				tiles[i].swap(tiles[j]);
			} else {
				var target = event.target,
					coords = target.coords.split(',');
				if (swapTile != null) {
					// Second tile in the swap
					var tile = Engine.getTile(coords[0], coords[1]);
					swapTile.swap(tile);
					Controller.update({ dest: 'client', type: 'swap', self: false, data: [swapTile.id, tile.id] });
					swapTile = null;
				} else {
					swapTile = Engine.getTile(coords[0], coords[1]);
				}
			}
		},
		
		// Set up the click state and register a click callback to swap the robber tile
		moveRobber: function (callback) {
			placeState('center', function (e) {
				var coords = e.target.coords.split(','),
					tile = Engine.getTile(coords[0], coords[1]);
				if (tile.id != this.robberTile.id) {
					tile.robber = true;
					this.robberTile.robber = false;
					this.robberTile = tile;
					Engine.drawRobber();
					callback && callback(listAdjacentPlayers(this.robberTile));
				} else {
					Game.msg('You must move the robber to a different tile!');
				}
			});
		}
	};
})();

