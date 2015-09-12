/**
 * Board
 * Contains information about the tile and port locations and types
 * in a Catan board
 */

var _ = require('underscore');
var util = require('./util');


// {size} is the number of radial rings in the game board
// Default tileCount is 19, expansion count is 30
//
// layout property an array of tile definitions, in grid order
// tile definitions are 2-element arrays of the format [token value, tile type]
//	- token value => dice roll for this tile
//	- tile type => int matching Board.Tiles enum for tiles
function Board(tileCount) {
	tileCount = tileCount || 19;


	// TODO: desert count
	var deserts = 1;

	var resourceCount = tileCount - deserts;
	// Carousel values until we reach the tile count
	var tileOrder = [
		Board.Tiles.Wood,
		Board.Tiles.Sheep,
		Board.Tiles.Wheat,
		Board.Tiles.Brick,
		Board.Tiles.Ore
	];

	var tiles = [];
	var current = 0;

	while (tiles.length < resourceCount) {
		tiles.push(tileOrder[current]);
		current = (current + 1) % tileOrder.length;
	}


	// Generate tile numbers
	// TODO: number of tiles should reflect tileCount
	var low = [2, 12].map(util.expand.bind(null, 1))
	var high = [3, 4, 5, 6, 8, 9, 10, 11].map(util.expand.bind(null, 2))

	tiles = _.chain(low.concat(high))
		.flatten()
		// Shuffle tokens
		.tap(function (tokens) { return util.shuffle(tokens); })
		// Match tokens with tiles by index
		.zip(tiles)
		.value();

	// Add in deserts, now that each resource tile has a token value
	_.each(util.expand(deserts, Board.Tiles.Desert), function (tile) {
		tiles.push([0, tile])
	})


	// Shuffle the resulting tiles after adding in deserts
	util.shuffle(tiles);



	// Generate board layout
	// Starting with size 3, increase until match
	var layout = [];
	var remaining = tileCount;
	var sideLength = 3;

	// Sides are symmetric, so subtract twice
	// var middle = layout.length / 2;
	while (remaining) {
		layout.push(util.expand(sideLength, function () {
			return tiles.shift();
		}));

		remaining -= sideLength;
		// Increase the number of tiles in the next row until past the halfway point
		sideLength += (remaining > tileCount / 2) ? 1 : -1;
	}

	this.layout = layout;


	// TODO: Generate ports
	// ports are [tile number, vertex pair, resource type]?
	// vertexes always start at north-west and move clockwise:
	//   0 ---- 1
	//  /        \
	// 5          2
	//  \        /
	//   4 ---- 3
}

// Returns a list of the [x,y] coordinates of the tiles of the given type
Board.prototype.locations = function (type) {
	var results = [];

	this.layout.forEach(function (row, i) {
		return row.forEach(function (tile, j) {
			if (tile[1] === type) {
				results.push([i, j])
			}
		});
	});

	return results;
}


// Enum of tile (resource) types
Board.Tiles = {
	Desert:	0x0,
	Wood:	0x1,
	Sheep:	0x2,
	Wheat:	0x4,
	Brick:	0x8,
	Ore:	0x10
}


module.exports = Board;
