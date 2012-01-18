// Prototype methods
Function.prototype.createDelegate = function (scope, o) {
	var self = this;
	return function () {
		self.apply(scope || this, (o && [o]) || arguments);
	};
};

var app = (function () {
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
	
	var CONST = {
		board: { height: 620, width: 620, landSize: 50, size: 3 },
		game: {
			resources: { desert: 'desert', ore: 'ore', brick: 'brick', wood: 'wood', wool: 'wool', wheat: 'wheat' },
			numTypes: 5,
			numTiles: 19
		},
		ID: { canvas: '#map', blank: '#blank' },
		tile: { img: { size: { x: 100, y: 114 }, path: '' }, colors: { 'wheat': '#FFC500', 'wool': '#B3F36D', 'wood': '#238C47', 'brick': '#BF7130', 'ore': '#AAA', 'desert': '#000', 'port': '#3F92D2'} },
		IP: 'localhost:1337',
		views: templates
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
		init: function () {
			// Add some additional functionality to the jQuery object
			$.dom = function (el) {
				var dom = $(el);
				return dom && dom[0];
			};
		},
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
	app.init();
	
	Controller.init(io);
	Controller.activate('host');
	Controller.go('list');
	Engine.init();
	
	// DEBUG
	// Engine.generateMap();
	Board.init(app.CONST.board.size);
	
	Controller.changeState('vertex');
	Game.init({ id: 0, name: 'peter' });
	Game.place({ type: 'settlement' });
	Game.turnOrder = [0];
	Game.startTurn({ turn: 0, roll: 6 });
	
	Controller.activate('chat');
});

