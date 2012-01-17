//
//	engine.js
//

var Engine = (function () {
	// -- Constants
	var CONST = app.CONST,
		height = CONST.board.height,
		length = CONST.board.width,
		landSize = CONST.board.landSize,
		alt = Math.sin(Math.PI/3)*landSize,
		canvasID = CONST.ID.canvas,
		blankID = CONST.ID.blank,
		imageSize = CONST.tile.img.size,
		// DEBUG
		colors = {
			'wheat': '#FFC500', 
			'wool': '#B3F36D', 
			'wood': '#238C47', 
			'brick': '#BF7130', 
			'ore': '#AAA',
			'desert': '#000',
			'port': '#3F92D2'
		},
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
		
	// -- State variables
	var canvas,
		ctx,
		rings,
		selectedTile = null,
		tiles = [];
		
	// Convience storage
	var centers = [];
	
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
	
	// -- Private methods
	function popRandom (arr) {
		return arr.splice(Math.floor(Math.random()*arr.length), 1)[0];
	}
	
	function findTile (x, y) {
		var i = centers.indexOf(x+y);
		return (i != -1 ? tiles[i] : null);
	}
	
	function getCenter (n, r) {
		var min = r || rings,
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
		centers[n] = (pos.x.toString() + pos.y.toString());
		return pos;
	}
	
	function getEdge (pos, type) {
		var len = landSize/2,
			cos = Math.cos,
			sin = Math.sin,
			pi = Math.PI;
		switch (type) {
			case 0:
				return { 
					start: { x: pos.x, y: pos.y - len },
					end: { x: pos.x, y: pos.y + len }
				};
				break;
			case 1:
				return {
					start: { x: pos.x + cos(pi/6)*len, y: pos.y - sin(pi/6)*len },
					end: { x: pos.x - cos(pi/6)*len, y: pos.y + sin(pi/6)*len }
				};
				break;
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
	
	return {
		init: function () {
			canvas = $(canvasID)[0],
			ctx = canvas.getContext('2d');
			// Initialize the drawing context
			ctx.translate(length/2, height/2);
			ctx.scale(1, -1);
			loaded = true;
			rings = 3;
		},
		// Returns true if the number of steps between vertex a and b is 
		// less than or equal to the number of provided steps, otherwise false
		separation: function (a, b, amt) {
			var floor = Math.floor,
				dist = pointDist(a, b);
			console.log(dist);
			return amt ? dist <= (floor(amt/2) + 1)*landSize : dist == 0;
		},
		// Draw the main map
		generateMap: function () {
			var tile,
				arr = [];
			for (var i = 0; i < resources.length; i++) {
				for (var j = 0; j < resources[i].count; j++) {
					arr.push(resources[i].type);
				}
			}
			// Generate the tile objects
			for (var u = 0; u < numTiles; u++) {
				tiles.push(tile = new Tile({ 
					id: u, 
					type: popRandom(arr),
					quality: popRandom(numbers)
				}));
				tile.draw();
			}
			
			// DEBUG
			// Port tiles
			console.log('rings', rings);
			// Generate the ids that the port tiles use (outer ring ids)
			// var ids = [0, 1, 2, 3, 4, 8, 9, 14, 15, 21, 22, 27, 28, 32, 33, 34, 35, 36];
			var ports = [];
			var ids = [0, 1, 2, 3, 8, 14, 21, 27, 32, 36, 35, 34, 33, 28, 22, 15, 9, 4];
			for (var m = 0; m < ids.length; m++) {
				var temp = new Port({
					id: ids[m],
					type: 'port',
					valid: m % 2 != 0
				});
				ports.push(temp);
				temp.draw();
			}
			// Create the clickable image maps over the canvas
			generateImageMaps();
			return { tiles: tiles, ports: ports };
		},
		// Set up the event to handle swapping of resource tiles on the map
		swapTiles: function () {
			var coords = this.coords.split(','),
				x = coords[0],
				y = coords[1];
			if (selectedTile) {
				selectedTile.swap(findTile(x, y));
				selectedTile = null;
			}
			else {
				selectedTile = findTile(x, y);
			}
		},
		placeObject: function (o, callback, scope) {
			var coords = this.coords.split(','),
				pos = { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
			if (map[o.type] == 'edge') {
				pos = getEdge(pos, parseInt($(this).attr('type')));
			}
			callback.call(scope, pos);
		},
		drawObject: function (pos, type) {
			ctx.save();
			ctx.scale(1, -1);
			ctx.translate(-(length/2), -(height/2));
			if (map[type] == 'vertex') {
				ctx.beginPath();
				ctx.moveTo(pos.x, pos.y);
				ctx.arc(pos.x, pos.y, sizes[type], 0, Math.PI*2, false);
				ctx.closePath();
				ctx.fill();
			}
			else if (map[type] == 'edge') {
				ctx.lineWidth = sizes[type];
				
				ctx.beginPath();
				ctx.moveTo(pos.start.x, pos.start.y);
				ctx.lineTo(pos.end.x, pos.end.y);
				ctx.closePath();
				ctx.stroke();
			}
			else {
				// Something weird was passed
			}
			
			ctx.restore();
		},
		getTilePosition: function (i, r) {
			if (typeof i == 'number') {
				return getCenter(i, r);
			}
			else {
				var coords = i.split(',');
				return findTile(coords[0], coords[1]).id;
			}
		},
		// Remove event listeners from the canvas element
		// Should be called between view steps, so that the canvas doesn't have any
		// leftover events hanging around from the previous step
		cleanup: function () {
			$('area').unbind('click');
		},
		// Add visual representation to all valid positions a particular object can take
		highlightAvailable: function (obj) { },
		
		// Getters
		canvas: canvas
	};
})();