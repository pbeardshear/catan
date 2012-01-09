// Prototype methods
Function.prototype.createDelegate = function (scope, o) {
	var self = this;
	return function () {
		self.apply(scope || this, (o && [o]) || arguments);
	};
};

var app = (function () {
	var views = [];
	
	return {
		// Change the view
		swap: function (view) {
			
		},
		// CONSTANTS
		CONST: {
			blankID: '#blank',
			canvasID: '#map'
		}
	};
})();


$(document).ready(function () {
	Controller.init(io);
	Controller.activate('host');
	Controller.go('list');
	Engine.init();
	Game.init();
	Game.startTurn();
	
	// DEBUG
	Controller.activate('chat');
});