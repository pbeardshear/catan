//
//	board.js
//

var Board = (function () {
	var height = app.CONST.height,
		width = app.CONST.width;
		
	// -- Private classes
	// Ports are considered tiles internally,
	// and a have one edge which is considered active (i.e. gives access to the port)
	function Port (o) {
		this.type = o.type;
		this.count = o.count;
		this.id = o.id;
		this.pos = o.pos;
	}
	
	function Tile (o) {
		this.id = o.id;
		this.type = o.type;
		this.quality = o.quality;
		this.robber = o.type == 'desert';
	}
	Tile.prototype.draw = function () {
		Engine.drawTile(this);
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
	
	// Public
	return {
		init: function (size) {
			
		}
	};
})();