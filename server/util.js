/**
 * Utility methods
 */

// Implementation of Durstenfeld shuffle
// Shuffle is done in-place
//
// Swaps the current element with a random element, then selects
// the next random element from the remainer of elements
// Skips the last element (0-index) since there are no elements left to swap
exports.shuffle = function (arr) {
	for (var i = arr.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));

		// Swap elements
		var temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}

	return arr;
}


// Returns an array of {count} elements, with each element equal to value
exports.expand = function (count, value) {
	var results = [];
	var func = typeof(value) === 'function';

	for (var i = 0; i < count; i++) {
		results.push(func ? value(i) : value);
	}

	return results;
}