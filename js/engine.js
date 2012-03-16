//
//	engine.js
//

var Engine = (function () {
	// Constants
	// ---------------------------------------------------------------------------------------------------------
	var CONST = app.CONST,
		height = CONST.board.height,
		length = CONST.board.width,
		landSize = CONST.board.landSize,
		alt = Math.sin(Math.PI/3)*landSize,
		canvasID = CONST.ID.canvas,
		roadCanvasID = CONST.ID.roadCanvas,
		piecesCanvasID = CONST.ID.piecesCanvas,
		blankID = CONST.ID.blank,
		imageSize = CONST.tile.img.size,
		portImageSize = CONST.port.img.size;
		portLocationOffset = 36,
		portLocationSize = CONST.port.locations.size;
		offsets = CONST.imageOffset,
		tileColors = CONST.tile.colors,
		tileImagePath = CONST.tile.img.path,
		// DEBUG
		numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
		resources = [
			{ type: 'wheat', count: 4 },
			{ type: 'brick', count: 3 },
			{ type: 'ore', count: 3 },
			{ type: 'wood', count: 4 },
			{ type: 'wool', count: 4 },
			{ type: 'desert', count: 1 }
		],
		sizes = {
			road: 4,
			settlement: 8,
			city: 15
		},
		map = {
			settlement: 'vertex', 
			city: 'vertex', 
			road: 'edge' 
		},
		numTiles = 19;
	
	// Mapping of possible player colors to their hex values
	var colors = {
		red: '#f32d2d',
		blue: '#2066f2',
		green: '#1fa926',
		purple: '#c63af5',
		cyan: '#23daca',
		gold: '#f8b530'
	};
	
	// Image files
	var tileImages = {
		ore: 'tile_ore.png',
		brick: 'tile_brick.png',
		wood: 'tile_wood.png',
		wool: 'tile_wool.png',
		grain: 'tile_grain.png',
		desert: 'tile_desert.png'
	};
	
	var qualityImages = {
		dot1: 'tile_n1.png',
		dot2: 'tile_n2.png',
		dot3: 'tile_n3.png',
		dot4: 'tile_n4.png',
		dot5: 'tile_n5.png'
	};
	
	var buildImages = {
		settlementRed: 'settlement_red.png',
		settlementBlue: 'settlement_blue.png',
		settlementCyan: 'settlement_cyan.png',
		settlementGold: 'settlement_gold.png',
		settlementGreen: 'settlement_green.png',
		settlementPurple: 'settlement_purple.png',
		cityRed: 'city_red.png',
		cityBlue: 'city_blue.png',
		cityCyan: 'city_cyan.png',
		cityGold: 'city_gold.png',
		cityGreen: 'city_green.png',
		cityPurple: 'city_purple.png'
	};
	
	var pieceCanvasMap;
	var portImage = 'icon_port.png'
	var validPortImage = 'port.png';
	var landImage = 'bg_land.png';
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var backgroundCtx,
		roadCtx,
		piecesCtx,
		size,
		selectedTile = null,
		tiles = [];
		
	// Convience storage
	var centers = [];
	
	// Private classes
	// ---------------------------------------------------------------------------------------------------------
	var ResourceManager = (function () {
		var _images = {};
		var _basePath;
		
		return {
			init: function (path) {
				_basePath = path;
			},
			load: function (name, path, bulk) {
				if (bulk) {
					for (var n in path) {
						if (path.hasOwnProperty(n)) {
							this.load(n, path[n], false);
						}
					}
					return;
				}
				var image = new Image();
				image.onload = function () {
					_images[name].loaded = true;
				};
				image.src = _basePath + path;
				_images[name] = { src: image, loaded: false };
			},
			isLoaded: function () {
				return (_images[image] && _images[image].loaded) || false;
			},
			get: function (image) {
				return _images[image].src || null;
			}
		};
	})();
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	// Drawing functions
	var draw = {
		background: function () {
			var ctx = pieceCanvasMap.background;
			ctx.save();
			ctx.drawImage(this, -length/2, -height/2);
			ctx.restore();
		},
		tile: function () {
			var ctx = pieceCanvasMap.tile;
			var center = getCenter(this.id),
				len = landSize,
				tileImage = ResourceManager.get(this.type),
				qualityImage = this.quality != 7 ? ResourceManager.get('dot' + this.qualityMap[this.quality]) : null;
			// Add the center to the list
			centers[this.id] = center.x.toString() + center.y.toString();
			ctx.save();
			
			// Adjust the center position to the default coordinate axis
			center.x -= (length/2);
			center.y = -(center.y - (height/2));
			
			// ctx.drawImage(tile, 0, 0, imageSize.x, imageSize.y, center.x - imageSize.x/2, center.y - imageSize.y/2, imageSize.x, imageSize.y);
			ctx.strokeStyle = '#FFF';
			ctx.drawImage(tileImage, center.x - alt, center.y - len);
			if (qualityImage) {
				ctx.drawImage(qualityImage, center.x - alt, center.y - len);
			}
			// ctx.fillStyle = tileColors[this.type] || tileColors[Math.floor(Math.random()*5)];
			ctx.beginPath();
			ctx.moveTo(center.x + alt, center.y + (len/2));
			ctx.lineTo(center.x, center.y + len);
			ctx.lineTo(center.x - alt, center.y + (len/2));
			ctx.lineTo(center.x - alt, center.y - (len/2));
			ctx.lineTo(center.x, center.y - len);
			ctx.lineTo(center.x + alt, center.y - (len/2));
			ctx.closePath();
			ctx.stroke();
			
			ctx.restore();
		},
		port: function () {
			var ctx = pieceCanvasMap.port;
			var portImage = ResourceManager.get('port');
			var portLocation = ResourceManager.get('portLocations');
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			// Draw the actual port
			ctx.drawImage(portImage, this.pos.x - (portImageSize.x/2), this.pos.y - (portImageSize.y/2));
			ctx.translate(this.pos.x, this.pos.y);
			ctx.rotate(-Math.PI/2);
			// TODO: This is difficult to understand, think of a better way to do this
			var rotation = Math.abs(this.docks[0] - this.docks[1]) == 1 ? min(this.docks) : 5;
			ctx.rotate((Math.PI/3)*rotation);
			ctx.drawImage(portLocation, -portLocationSize.x/2, -portLocationSize.y/2 + portLocationOffset);
			// Set text properties
			ctx.fillStyle = "#FFF";
			ctx.font = "11px Trebuchet MS";
			ctx.textAlign = "center";
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			var yOffset = this.pos.y > height/2 ? 37 : -30;
			var tradeString = [this.count, ': 1', base.string.capitalize(this.type)].join(' ');
			ctx.fillText(tradeString, this.pos.x, this.pos.y + yOffset);
			ctx.restore();
		},
		road: function (color) {
			var ctx = pieceCanvasMap.road
			var position = (!this.pos.start || !this.pos.end ? getEdge(this.pos, this.type) : this.pos);
			ctx.save();
			ctx.strokeStyle = '#FFF';
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.lineWidth = 7;
			ctx.beginPath();
			ctx.moveTo(position.start.x, position.start.y);
			ctx.lineTo(position.end.x, position.end.y);
			ctx.closePath();
			ctx.stroke();
			ctx.strokeStyle = colors[color] || '#000';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(position.start.x, position.start.y);
			ctx.lineTo(position.end.x, position.end.y);
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		},
		settlement: function (color) {
			var ctx = pieceCanvasMap.settlement;
			var settlementColor = 'settlement' + base.string.capitalize(color);
			var image = ResourceManager.get(settlementColor);
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(image, this.pos.x - offsets.settlement.x, this.pos.y - offsets.settlement.y);
			ctx.restore();
		},
		city: function (color) {
			var ctx = pieceCanvasMap.city;
			var cityColor = 'city' + base.string.capitalize(color);
			var image = ResourceManager.get(cityColor);
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(image, this.pos.x - offsets.city.x, this.pos.y - offsets.city.y);
			ctx.restore();
		}
	};
	
	function findTile (x, y) {
		var i = centers.indexOf(x+y);
		return (i != -1 ? tiles[i] : null);
	}
	
	function getCenter (n, r) {
		var min = r || size,
			mid = min - 1,
			max = min + mid;
		
		var x = 0,
			y = 0,
			i = n,
			j = min;
		
		while (i - j >= 0) {
			i -= j;
			++y;
			j = (y <= mid ? j+1 : j-1);
		}
		x = i;
		
		var off = mid - y,
			diff = Math.abs(off);
		
		var pos = {
			x : (-(mid * 2 * alt) + (diff * alt) + (x * 2 * alt)) + (length/2),
			y : -(off * (3/2) * landSize) + (height/2)
		};
		// centers[n] = (pos.x.toString() + pos.y.toString());
		return pos;
	}
	
	function getEdge (pos, type) {
		var len = landSize/2,
			cos = Math.cos,
			sin = Math.sin,
			pi = Math.PI;
		switch (parseInt(type)) {
			case '0':
			case 0:
				return {
					start: { x: pos.x, y: pos.y - len },
					end: { x: pos.x, y: pos.y + len }
				};
				break;
			case '1':
			case 1:
				return {
					start: { x: pos.x + cos(pi/6)*len, y: pos.y - sin(pi/6)*len },
					end: { x: pos.x - cos(pi/6)*len, y: pos.y + sin(pi/6)*len }
				};
				break;
			case '2':
			case 2: 
				return {
					start: { x: pos.x + cos(pi/6)*len, y: pos.y + sin(pi/6)*len },
					end: { x: pos.x - cos(pi/6)*len, y: pos.y - sin(pi/6)*len }
				};
				break;
		}
	}
	
	function generateImageMaps () {
		var mapCenter = document.createElement('map'),
			mapEdge = document.createElement('map'),
			mapVertex = document.createElement('map');
		mapCenter.setAttribute('name', 'board-center');
		mapEdge.setAttribute('name', 'board-edge');
		mapVertex.setAttribute('name', 'board-vertex');
		
		mapCenter.setAttribute('id', 'board-center');
		mapEdge.setAttribute('id', 'board-edge');
		mapVertex.setAttribute('id', 'board-vertex');
		
		for (var i = 0; i < numTiles; i++) {
			var areaCenter = document.createElement('area'),
				center = getCenter(i);
			// Center
			areaCenter.setAttribute('shape', 'circle');
			areaCenter.setAttribute('coords', [center.x, center.y, 35].join(','));
			areaCenter.setAttribute('href', '#');
			
			// Edges and vertices
			var cos = Math.cos,
				sin = Math.sin,
				eang = Math.PI/3,
				vang = Math.PI/2;
			for (var j = 0; j < 6; j++) {
				var areaEdge = document.createElement('area'),
					areaVertex = document.createElement('area');
				areaEdge.setAttribute('shape', 'circle');
				areaEdge.setAttribute('coords', [center.x + alt*cos(eang*j), center.y + alt*sin(eang*j), 20].join(','));
				areaEdge.setAttribute('type', j % 3);
				areaEdge.setAttribute('href', '#');
				
				areaVertex.setAttribute('shape', 'circle');
				areaVertex.setAttribute('coords', [center.x + landSize*cos(vang+eang*j), center.y + landSize*sin(vang+eang*j), 15].join(','));
				areaVertex.setAttribute('href', '#');
				
				mapEdge.appendChild(areaEdge);
				mapVertex.appendChild(areaVertex);
			}
			mapCenter.appendChild(areaCenter);
		}
		var container = document.getElementById('gamePage');
		container.appendChild(mapCenter);
		container.appendChild(mapEdge);
		container.appendChild(mapVertex);
	}
	
	function round (num, dec) {
		return Math.round(num * Math.pow(10, dec))/Math.pow(10, dec);
	}
	
	function max (a, b) {
		return typeof a == 'object' && a.length ? a.sort()[a.length-1] : Math.max(a, b);
	}
	
	function min (a, b) {
		return typeof a == 'object' && a.length ? a.sort()[0] : Math.min(a, b);
	}
	
	function pointDist (a, b) {
		return round(Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)), 2);
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		loaded: false,
		init: function () {
			// Set up state variables
			backgroundCtx = $.dom(canvasID).getContext('2d');
			roadCtx = $.dom(roadCanvasID).getContext('2d');
			piecesCtx = $.dom(piecesCanvasID).getContext('2d');
			// Establish a mapping between canvas and drawable object
			pieceCanvasMap = {
				road: roadCtx,
				settlement: piecesCtx,
				city: piecesCtx,
				tile: backgroundCtx,
				port: backgroundCtx,
				background: backgroundCtx
			};
			size = app.CONST.board.size;
			// Initialize the drawing context
			backgroundCtx.translate(length/2, height/2);
			backgroundCtx.scale(1, -1);
			
			// Initialize the resource manager
			ResourceManager.init(app.CONST.imagePath);
			// Load the images that we will need
			// Bulk load
			ResourceManager.load(null, tileImages, true);
			ResourceManager.load(null, qualityImages, true);
			ResourceManager.load(null, buildImages, true);
			// Load port images
			ResourceManager.load('port', portImage);
			ResourceManager.load('portLocations', validPortImage);
			ResourceManager.load('background', landImage);
			// Set loaded flags
			this.loaded = true;
		},
		generateMap: function (boardTiles, boardPorts) {
			app.transition({ from: 'host', to: 'setup' });
			// Draw the background image
			var background = ResourceManager.get('background');
			// draw.background.call(background);
			tiles = boardTiles;
			ports = boardPorts;
			console.log('tile length', tiles.length);
			// Draw the tiles to the screen
			for (var i = 0; i < tiles.length; i++) {
				tiles[i].draw();
			}
			for (var i = 0; i < ports.length; i++) {
				if (ports[i].valid) {
					ports[i].draw();
				}
			}
			// Create the image maps
			generateImageMaps();
		},
		draw: function (o, type, args) {
			return draw[type].apply(o, args);
		},
		getCoords: function (index, size) {
			return getCenter(index, size);
		},
		getTile: function (x, y) {
			return findTile(x, y);
		},
		getPosition: function (position, type) {
			return type ? getEdge(position, type) : position;
		},
		setActiveMap: function (mapID) {
			$(blankID).attr('usemap', mapID);
		},
		pointDistance: function (a, b) {
			return pointDist(a, b);
		}
	};
})();