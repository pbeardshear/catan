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
