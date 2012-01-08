// Prototype methods
Function.prototype.createDelegate = function (scope, o) {
	var self = this;
	return function () {
		self.apply(scope || this, (o && [o]) || arguments);
	};
};

var app = (function () {
	return {
		// CONSTANTS
		CONST: {
			blankID: '#blank',
			canvasID: '#map'
		}
	};
})();


$(document).ready(function () {
	Controller.init(io);
	Engine.init();
	Game.init();
	Game.startTurn();
	
	// DEBUG
	Controller.activate('chat');
});