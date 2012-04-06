// Prototype methods
Function.prototype.createDelegate = function (scope, o) {
	var self = this;
	return function () {
		self.apply(scope || this, (o && [o]) || arguments);
	};
};

var app = (function () {
	// Constants
	// -------------------------------------------------------------------------------------------------------------------
		
	var CONST = {
		board: { height: 620, width: 620, landSize: 50, size: 3 },
		game: {
			resources: { desert: 'desert', ore: 'ore', brick: 'brick', wood: 'wood', wool: 'wool', grain: 'grain' },
			numTypes: 5,
			numTiles: 19
		},
		ID: { 
			canvas: '#map',
			blank: '#blank', 
			mapPane: '#mapPane',
			steal: '#stealPopup',
			chat: '#chatLog .wrap',
			plenty: '#plentyPopup', 
			notice: '#eventNotice p', 
			monopoly: '#monopolyPopup',
			gameList: '#gameList table .game',
			playerList: '#playerList ul',
			resources: '#resources .items',
			canvasContainer: '#mapContainer',
			playerInfo: '#playerInfo',
			developmentCards: '#development items'
		},
		tile: { img: { size: { x: 100, y: 114 }, path: '' }, colors: { 'grain': '#FFC500', 'wool': '#B3F36D', 'wood': '#238C47', 'brick': '#BF7130', 'ore': '#AAA', 'desert': '#000', 'port': '#3F92D2'} },
		IP: 'http://localhost:1337',
		views: { 
			host: { id: '#hostPage', fn: initHost },
			setup: { id: '#setupPage', fn: initSetup },
			game: { id: '#gamePage', fn: initGame }
		}
	};
	
	CONST.templates = {
		host: {
			list: {
				template: ['<tr class="game" value="', 0, '"><td class="gameName">', 1, '</td><td>', 2, '/', 3, '</td><td><a class="join button">Join</a></td></tr'],
				container: CONST.ID.gameList
			}
		},
		setup: {
			player: {
				template: ['<li><div class="colorSquare"></div><div class="player">', 0, '</div></li>'],
				container: CONST.ID.playerList
			}
		},
		game: {
			chat: {
				template: ['<p><em class="name">', 0, ':</em>', 1, '</p>'],
				container: CONST.ID.chat
			},
			status: {
				template: ['<tr class="', 0, '"><td class="name">', 1, '</td><td class="achievement">', 2, '</td><td class="resource"><em>R:</em> ', 3, '</td><td class="development"><em>D:</em> ', 4, '</td><td class="victory"><em>V:</em> ', 5, '</td></tr>'],
				items: ' tbody tr ',
				container: CONST.ID.playerInfo
			},
			resources: {
				template: ['<li class="', 0, '">', 1, '</li>'],
				container: CONST.ID.resources
			},
			cards: {
				template: ['<li>< a href class="button" value="', 0, '">', 1, '</a></li>'],
				container: CONST.ID.developmentCards
			}
		}
	};

	
	// State variables
	// -------------------------------------------------------------------------------------------------------------------
	var currentView = 'host';
	
	// Private methods
	// -------------------------------------------------------------------------------------------------------------------
	// View initialization
	function initHost () { }
	function initSetup () { }
	function initGame () {
		$(CONST.ID.canvasContainer).appendTo(CONST.ID.mapPane);
	}
	
	function build (template, o, current) {
		var copy = template.concat();
		for (var i = 0; i < copy.length; i++) {
			if (typeof copy[i] == 'number') {
				copy[i] = o[copy[i]];
			}
		}
		return copy.join('');
	}
	
	var apply = {
		append: function (template, o) {
			$(template.container).append(build(template.template, o.data));
			return true;
		},
		overwrite: function (template, o) {
			o.data.unshift(o.which);
			$(template.container + (template.items || '')).children('.'+o.which).replaceWith(build(template.template, o.data));
			return true;
		},
		remove: function (template, o) {
			var filter = '[value="' + o.which + '"]',
				el = $(template.container).find(filter);
			if (el) {
				$.deepRemove(el, $(template.container));
				return true;
			}
			else {
				return false;
			}
		},
		decrement: function (template, o) {
			var filter = '[value="' + o.which + '"]',
				el = $(template.container).find(filter),
				text = $(el).text().split(' x ');
			if (el && text.length != 1) {
				var count = parseInt(text[1]) - 1;
				$(el).text(count == 1 ? text[0] : text[0] + ' x ' + count.toString());
				return true;
			}
			else {
				return false;
			}
		},
		increment: function (template, o) {
			var filter = '[value="' + o.which + '"]',
				el = $(template.container).find(filter);
			if (el) {
				var text = $(el).text().split(' x '),
					count = parseInt(text[1]);
				$(el).text(text[0] + ' x ' + (++count).toString());
				return true;
			}
			else {
				return false;
			}
		}
	};
	
	// Public
	// -------------------------------------------------------------------------------------------------------------------
	return {
		init: function () {
			// Add some additional functionality to the jQuery object
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
			
			// Prototype methods
			// Simplified pluralizing method
			String.prototype.pluralize = function () {
				var last = this[this.length - 1];
				return last == 'y' ? this.substring(0, this.length - 1) + 'ies' : this + 's';
			};
		},
		// Change the view
		transition: function (order) {
			var from = CONST.views[order.from],
				to = CONST.views[order.to];
			// Execute any additional view manipulation that needs to occur on transition
			to.fn();
			$(from.id).hide(200);
			$(to.id).show(200);
			
			currentView = order.to;
		},
		// o -> { type: "append", data: ['test1', 'test2', 'test3'] }
		// o -> { type: ["decrement", "remove"], which: 'knight' }
		// o -> { type: "overwrite", which: '.red', data: ['test1', 'test2', 'test3'] }
		update: function (area, o) {
			var template = CONST.templates[currentView][area];
			// Super slick!
			if (typeof(o.type) == 'object') {
				// Multiple update types, iterate through each one in order
				// If one fits, apply that one, and end
				for (var i = 0; i < o.type.length; i++) {
					if (apply[o.type[i]](template, o)) {
						break;
					}
				}
			}
			else {
				// One update type, just try that
				apply[o.type](template, o);
			}
			// var temp = CONST.templates[view][area];
			// $(temp.container).append(build(temp.template, o));
		},
		updateResources: function (resources) {
			var current = $(CONST.ID.resources).children();
			$.each(current, function (i, val) {
				var type = $(this).attr('class');
				if (resources[type]) {
					var count = parseInt($(this).text()) + resources[type];
					$(this).text(count);
				}
			});
		},
		// CONSTANTS
		CONST: CONST
	};
})();

$(document).ready(function () {
	app.init();
	
	Controller.init(io, true, actions);
	Controller.activate('host');
	Controller.go('list');
	Engine.init();
	
	// DEBUG
	// Engine.generateMap();
	// Board.init(app.CONST.board.size);
	
	// Controller.changeState('vertex');
	// Game.init({ id: 0, name: 'peter' });
	// Game.place({ type: 'settlement' });
	// Game.turnOrder = [0];
	// Game.startTurn({ turn: 0, roll: 6 });
	
	Controller.activate('chat');
});

