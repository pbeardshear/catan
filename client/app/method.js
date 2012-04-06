//
//	method.js
//	Useful prototype methods
//
var base = { };

// Object prototype
base.size = function (o) {
	if (o.length) {
		return o.length;
	}
	var i = 0;
	o.each(function () { ++i; });
	return i;
};

base.each = function (o, fn) {
	var vals = [];
	if (o.length) {
		for (var i = 0; i < o.length; i++) {
			vals.push(fn(o[i], i));
		}
	}
	else {
		for (var prop in o) {
			if (o.hasOwnProperty(prop)) {
				vals.push(fn(o[prop], prop));
			}
		}
	}
	return vals;
};

base.validate = function (arr, fn) {
	return base.each(arr, fn).indexOf(false) == -1;
};

base.accessor = function (o, state) {
	o.get = function (name) {
		return state[name];
	};
	o.set = function (name, val) {
		state[name] = val;
	};
};

base.map = function (arr, fn) {
	for (var i = 0; i < arr.length; i++) {
		arr[i] = fn(arr[i]);
	}
};

base.filter = function (arr, fn) {
	var keep = [];
	for (var i = 0; i < arr.length; i++) {
		if (fn(arr[i])) {
			keep.push(arr[i]);
		}
	}
	return keep;
};

// Merge two lists, modifying the first in place
base.merge = function (a, b) {
	if (base.isArray(a) && base.isArray(b)) {
		base.each(b, function (el) {
			a.push(el);
		});
		return a;
	} else {
		return null;
	}
};

// Removes all elements from the array, modifying the original
base.empty = function (arr) {
	if (base.isArray(arr)) {
		arr.splice(0, arr.length);
	}
};

// Type checkers
base.isArray = function (arr) {
	return arr instanceof Array;
}

// Converts a dictionary into a comma separated list of key,values
// Optionally, you can pass a function which should return a string for each key, value pair
base.toString = function (hash, fn) {
	var result = [];
	base.each(hash, function (val, key) {
		var val = fn ? fn(key, val) : (key + ':' + val);
		if (val) { result.push(val); }
	});
	return result.join(', ');
};

// String methods
base.string = { };

base.string.pluralize = function (str) {
	return str.substring(str.length - 1) == 'y' ? str.substring(0, str.length - 1) + 'ies' : str + 's';
};

base.string.capitalize = function (str) {
	return str.substring(0, 1).toUpperCase() + str.substring(1);
};

// Function methods
base.fn = { };

base.fn.delegate = function (scope, fn) {
	return function () {
		return fn.apply(scope, arguments);
	};
};

//
// Some jQuery specific methods
//
if ($) {
	$.dom = function (el) {
		var dom = $(el);
		return dom && dom[0];
	};
	
	$.deepRemove = function (el, base) {
		if (el[0] != base[0]) {
			var parent = el.parent();
			el.remove();
			$.deepRemove(parent, base);
		}
	};
}
