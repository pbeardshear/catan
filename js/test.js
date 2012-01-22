//
//	Unit testing
//

var assert = (function () {
	
	// Private class
	// ---------------------------------------------------------------------
	function AssertError (message) {
		this.name = 'AssertError';
		this.message = message || '';
	}
	AssertError.prototype = new Error();
	
	return {
		is: function (o) {
			o || throw new AssertError("argument is not truthy:", o);
		},
		isFalse: function (o) {
			!o || throw new AssertError("argument is not falsey:", o);
		},
		// Naive equality
		isEqual: function (a, b) {
			a == b || throw new AssertError("arguments are not equal:", a, b);
		},
		// Deep equality
		isEquivalent: function (a, b) {
			if (typeof a == 'object' && typeof b == 'object') {
				if (a.length && b.length) {
					// Array
					a.sort();
					b.sort();
					for (var i = 0; i < a.length; i++) {
						try {
							this.isEquivalent(a[i], b[i]);
						}
						catch (err) {
							throw new AssertError("arguments are not equivalent:", a, b);
						}
					}
				}
				else {
					// Object
					for (var prop in a) {
						if (a.hasOwnProperty(prop) && b.hasOwnProperty(prop)) {
							try {
								this.isEquivalent(a[prop], b[prop]);
							}
							catch {
								throw new AssertError("arguments are not equivalent:", a, b);
							}
						}
						else {
							this.isEqual(a, b);
						}
					}
				}
			}
			else {
				this.isEqual(a, b);
			}
		},
		hasProp: function (o, prop) {
			(typeof o == 'object' && o[prop]) || throw new AssertError("argument:", o, "does not have the provided property:", prop);
		},
		hasEl: function (o, el) {
			if (typeof o != 'object' || !o.length) {
				throw new AssertError("argument:", o, "does not have the provided element:", el);
			}
			for (var i = 0; i < o.length; i++) {
				if (o[i] == el) {
					return true;
				}
			}
			throw new AssertError("argument:", o, "does not have the provided element:", el);
		}
	};
})();

// Unit tests
function testResource () {
	
}

function testDrawCard () {
	
}
