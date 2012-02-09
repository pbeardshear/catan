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
		blankID = CONST.ID.blank,
		imageSize = CONST.tile.img.size,
		tileColors = CONST.tile.colors,
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
		red: '#A2000C',
		blue: '#09276F',
		green: '#007D1C',
		orange: '#FF7800',
		yellow: '#FF3740',
		brown: '#472F00',
		white: '#FFFFFF',
		purple: '#47036F'
	};
		
	// State variables
	// ---------------------------------------------------------------------------------------------------------
	var ctx,
		size,
		selectedTile = null,
		tiles = [];
		
	// Convience storage
	var centers = [];
	
	/*
	// -- Private classes
	function Port (o) {
		this.type = o.type;
		this.count = o.count;
		this.pos = o.pos;
		this.id = o.id;
		this.validPoints = [0, 1];
		this.hasPort = o.valid;
	}
	
	Port.prototype.draw = function () {
		var center = getCenter(this.id, 4),
			len = landSize;
		ctx.save();
		
		// Adjust the center position to the default coordinate axis
		center.x -= (length/2);
		center.y = -(center.y - (height/2));
		
		// ctx.drawImage(tile, 0, 0, imageSize.x, imageSize.y, center.x - imageSize.x/2, center.y - imageSize.y/2, imageSize.x, imageSize.y);
		ctx.fillStyle = colors[this.type] || colors[Math.floor(Math.random()*5)];
		ctx.beginPath();
		ctx.moveTo(center.x + alt, center.y + (len/2));
		ctx.lineTo(center.x, center.y + len);
		ctx.lineTo(center.x - alt, center.y + (len/2));
		ctx.lineTo(center.x - alt, center.y - (len/2));
		ctx.lineTo(center.x, center.y - len);
		ctx.lineTo(center.x + alt, center.y - (len/2));
		ctx.closePath();
		ctx.stroke();
		ctx.fill();
		
		if (this.hasPort) {
			ctx.fillStyle = '#000';
			ctx.beginPath();
			ctx.arc(center.x, center.y, 10, 0, Math.PI*2, false);
			ctx.closePath();
			ctx.fill();
		}
		
		ctx.restore();
	};
	
	function Tile (o) {
		this.id = o.id;
		this.type = o.type;
		this.quality = o.quality;
		this.robber = o.type == 'desert';
	}
	
	Tile.prototype.draw = function () {
		var center = getCenter(this.id),
			len = landSize;
		ctx.save();
		
		// Adjust the center position to the default coordinate axis
		center.x -= (length/2);
		center.y = -(center.y - (height/2));
		
		// ctx.drawImage(tile, 0, 0, imageSize.x, imageSize.y, center.x - imageSize.x/2, center.y - imageSize.y/2, imageSize.x, imageSize.y);
		ctx.fillStyle = colors[this.type] || colors[Math.floor(Math.random()*5)];
		ctx.beginPath();
		ctx.moveTo(center.x + alt, center.y + (len/2));
		ctx.lineTo(center.x, center.y + len);
		ctx.lineTo(center.x - alt, center.y + (len/2));
		ctx.lineTo(center.x - alt, center.y - (len/2));
		ctx.lineTo(center.x, center.y - len);
		ctx.lineTo(center.x + alt, center.y - (len/2));
		ctx.closePath();
		ctx.stroke();
		ctx.fill();
		
		ctx.restore();	
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
	*/
	
	// Private methods
	// ---------------------------------------------------------------------------------------------------------
	// Drawing functions
	var draw = {
		tile: function () {
			var center = getCenter(this.id),
				len = landSize;
			// Add the center to the list
			centers[this.id] = center.x.toString() + center.y.toString();
			ctx.save();
			
			// Adjust the center position to the default coordinate axis
			center.x -= (length/2);
			center.y = -(center.y - (height/2));
			
			// ctx.drawImage(tile, 0, 0, imageSize.x, imageSize.y, center.x - imageSize.x/2, center.y - imageSize.y/2, imageSize.x, imageSize.y);
			ctx.fillStyle = tileColors[this.type] || tileColors[Math.floor(Math.random()*5)];
			ctx.beginPath();
			ctx.moveTo(center.x + alt, center.y + (len/2));
			ctx.lineTo(center.x, center.y + len);
			ctx.lineTo(center.x - alt, center.y + (len/2));
			ctx.lineTo(center.x - alt, center.y - (len/2));
			ctx.lineTo(center.x, center.y - len);
			ctx.lineTo(center.x + alt, center.y - (len/2));
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
			
			ctx.restore();
		},
		port: function () { },
		road: function (color) {
			var position = (!this.pos.start || !this.pos.end ? getEdge(this.pos, this.type) : this.pos);
			ctx.save();
			ctx.strokeStyle = colors[color] || "#000";
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(position.start.x, position.start.y);
			ctx.lineTo(position.end.x, position.end.y);
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		},
		settlement: function (color) {
			ctx.save();
			ctx.fillStyle = colors[color] || "#000";
			ctx.beginPath();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.arc(this.pos.x, this.pos.y, 10, 0, Math.PI*2, false);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		},
		city: function (color) {
			ctx.save();
			ctx.fillStyle = colors[color] || "#000";
			ctx.beginPath();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.arc(this.pos.x, this.pos.y, 15, 0, Math.PI*2, false);
			ctx.closePath();
			ctx.fill();
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
	
	function pointDist (a, b) {
		return round(Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)), 2);
	}
	
	// Public
	// ---------------------------------------------------------------------------------------------------------
	return {
		loaded: false,
		init: function () {
			// Set up state variables
			ctx = $.dom(canvasID).getContext('2d');
			size = app.CONST.board.size;
			// Initialize the drawing context
			ctx.translate(length/2, height/2);
			ctx.scale(1, -1);
			// Set loaded flags
			this.loaded = true;
		},
		generateMap: function (boardTiles) {
			tiles = boardTiles;
			// Draw the tiles to the screen
			for (var i = 0; i < tiles.length; i++) {
				tiles[i].draw();
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