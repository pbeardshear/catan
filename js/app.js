// Prototype methods
Function.prototype.createDelegate = function (scope, o) {
	var self = this;
	return function () {
		self.apply(scope || this, (o && [o]) || arguments);
	};
};

var app = (function () {
	var CONST = {
		board: { height: 620, width: 620, landSize: 50 },
		ID: { canvas: '#map', blank: '#blank' },
		IP: 'localhost:1337'
	};
	var templates = {
		host: {
			list: {
				template: ['<tr><td>', 0, '</td><td>', 1, '/', 2, '</td><td><a class="join button">Join</a></td></tr'],
				container: '#gameList table'
			}
		},
		setup: {
			player: {
				template: ['<li><div class="colorSquare"></div><div class="player">', 0, '</div></li>'],
				container: '#playerList ul'
			}
		},
		game: {
			chat: {
				template: ['<p><em class="name">', 0, ':</em>', 1, '</p>'],
				container: '#chatLog .wrap'
			}
		}
	};
	
	function build (template, o) {
		for (var i = 0; i < template.length; i++) {
			if (typeof template[i] == 'number') {
				template[i] = o[template[i]];
			}
		}
		return template.join('');
	}
	
	return {
		// Change the view
		swap: function (prev, next) {
			$(this.CONST.views[prev]).hide(200);
			$(this.CONST.views[next]).show(200);
		},
		apply: function (view, area, o) {
			var temp = templates[view][area];
			$(temp.container).append(build(temp.template, o));
		},
		// CONSTANTS
		CONST: CONST
	};
})();


$(document).ready(function () {
	Controller.init(io);
	Controller.activate('host');
	Controller.go('list');
	Engine.init();
	// Engine.generateMap();
	
	// Game.startTurn();
	
	// DEBUG
	Controller.activate('chat');
});

