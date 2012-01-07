//
//	engine.js
//

var Engine = (function () {
	// -- Constants
	var height = 620,
		length = 620,
		landSize = 50,
		alt = Math.sin(Math.PI/3)*landSize,
		canvasID = '#map',
		blankID = '#blank',
		imageSize = { x: 100, y: 114 },
		// DEBUG
		colors = {
			'wheat': '#FFC500', 
			'wool': '#B3F36D', 
			'wood': '#238C47', 
			'brick': '#BF7130', 
			'ore': '#AAA',
			'desert': '#000'
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
	function Tile (o) {
		this.id = o.id;
		this.position = o.position;
		this.type = o.type;
		this.quality = o.quality;
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
		return arr.splice(Math.floor(Math.random()*arr.length), 1);
	}
	
	function findTile (x, y) {
		var i = centers.indexOf(x+y);
		return (i != -1 ? tiles[i] : null);
	}
	
	function getCenter (n) {
		var min = rings,
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
		
		var container = document.getElementById('container');
		container.appendChild(mapCenter);
		container.appendChild(mapEdge);
		container.appendChild(mapVertex);
	}
	
	function drawObject (pos, type, map, edgeType) {
		if (map[type] == 'vertex') {
			ctx.save();
			
			ctx.scale(1, -1);
			ctx.translate(-(length/2), -(height/2));
			ctx.beginPath();
			ctx.moveTo(pos.x, pos.y);
			ctx.arc(pos.x, pos.y, sizes[type], 0, Math.PI*2, false);
			ctx.closePath();
			ctx.fill();
			
			ctx.restore();
		}
		else if (map[type] == 'edge') {
			var edge = getEdge({ x: parseFloat(pos.x), y: parseFloat(pos.y) }, parseInt(edgeType)) ;
			ctx.save();
			
			ctx.scale(1, -1);
			ctx.translate(-(length/2), -(height/2));
			
			ctx.lineWidth = sizes[type];
			
			ctx.beginPath();
			ctx.moveTo(edge.start.x, edge.start.y);
			ctx.lineTo(edge.end.x, edge.end.y);
			ctx.closePath();
			ctx.stroke();
			
			ctx.restore();
		}
		else {
			// Something weird was passed
		}
	}
	
	function changeSelectionState (state) {
		var imageMap = '#board-' + state;
		// Check if a valid state was passed
		if ($(imageMap).length) {
			$(blankID).attr('usemap', imageMap);
		}
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
			
			// DEBUG
			generateImageMaps();
			this.drawMap(3);
			this.swapTiles();
		},
		// Draw the main map
		drawMap: function (r) {
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
		},
		// Set up the event to handle swapping of resource tiles on the map
		swapTiles: function () {
			// Change the selection state
			changeSelectionState('center');
			$('#board-center area').bind('click', function () {
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
			});
		},
		placeObject: function (o, callback, scope) {
			var map = { settlement: 'vertex', city: 'vertex', road: 'edge' };
			changeSelectionState(map[o.type]);
			$('#board-' + map[o.type] + ' area').bind('click', function () {
				var coords = this.coords.split(','),
					edgeType = $(this).attr('type');
				drawObject({ x: coords[0], y: coords[1] }, o.type, map, edgeType);
				callback.call(scope);
			});
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