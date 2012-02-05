//
//	app.js
//

var app = (function () {
	var CONST = {
		views: { host: '#hostPage', setup: '#setupPage', game: '#gamePage' },
		board: { size: 3, height: 620, width: 620, landSize: 50 },
		tile: { img: { size: { x: 100, y: 114 }, path: '' }, colors: { 'grain': '#FFC500', 'wool': '#B3F36D', 'wood': '#238C47', 'brick': '#BF7130', 'ore': '#AAA', 'desert': '#000', 'port': '#3F92D2'} },
		game: { numTypes: 5, numTiles: 19 },
		ID: { canvas: '#map', blank: '#blank' },
		IP: 'http://localhost:1337'
	};
	var phases = { };
	// Data requests that the server can make to the client
	var dataRequest = {
		board: function () {
			return Board.getState();
		}
	};
	// Client-side actions corresponding directly to dom events, send update to server
	var actions = {
		host: {
			event: 'submit',
			fn: function (e) {
				var values = { };
				e.preventDefault();
				values.username = $('#hostGame [name="username"]').val();
				$.each($(this).serializeArray(), function (i, field) {
					values[field.name] = field.value;
				});
				values.private = (values.private == 'on');
				if (values.username && values.game && values.players) {
					Controller.fire('host', values);
				}
			}
		},
		join: function (e) {
			var gameName = $(this).closest('.game').children('.gameName').text(),
				userName = $('#hostGame [name="username"]').val();
			if (gameName && userName) {
				Controller.fire('join', { game: gameName, username: userName });
			}
		},
		startGame: function (e) {
			Controller.fire('startGame');
		},
		endTurn: function (e) {
			Controller.fire('endTurn');
		},
		build: function (e) {
			Game.build(this.attributes['value'].value);
		},
		chat: {
			event: 'submit',
			fn: function (e) {
				e.preventDefault();
				// Data required: { player: playerName, message: chatMessage }
				var playerName = Game.get('self').get('name');
				var chatMessage = $('#chatMessage').val();
				Controller.fire('chat', { player: playerName, message: chatMessage });
				// Clear the text field
				$('#chatMessage').val('');
			}
		},
		useCard: function (e) {
			// Determine the type of card that was used
		},
		cancel: function () {
			// Close a popup
			$('.popup').hide();
		},
		trade: function (e) {
			// Data required: { id: playerID, request: { give: resourcesToGive, receive: resourcesToReceive } }
			Game.trade(request, true);
			Controller.fire('trade', { id: playerID, request: request });
		},
		tradeResponse: function (e) {
			Controller.fire('trade', { accept: $(this).hasClass('acceptTrade') });
		}
	};
	// Server commands, update state on client
	var commands = {
		host: function (res) {
			console.log('received host');
			if (res.success) {
				Game.init(res);
				Game.setup();
			}
		},
		join: function (res) {
			if (res.success) {
				Game.init(res);
			}
		},
		addPlayers: function (res) {
			Game.addPlayers(res);
		},
		setup: function (res) {
			if (res.success) {
				Controller.release('host');
				Controller.release('join');
				app.transition({ from: 'host', to: 'setup' });
				Controller.request('startGame');
			}
		},
		initPlacement: function (res, fn) {
			var callback = function () {
				Board.beginPlace(Game.get('self'), 'road', true, fn);
			};
			Board.beginPlace(Game.get('self'), 'settlement', true, callback);
		},
		startGame: function (res) {
			if (res.success) {
				console.log('starting game', res);
				Game.begin();
			}
		},
		startTurn: function (res) {
			console.log('starting turn', res)
			Game.startTurn(res);
		},
		endTurn: function (res) {
			Game.endTurn(res);
		},
		chat: function (data) {
			// TODO: Remove hardcode
			var template = ['<p><em class="name">', data.player, ':</em> ', data.message, '</p>'];
			var chatWindow = $('#chatLog .wrap');
			template = template.join('');
			chatWindow.append(template);
			// Scroll the chat window to the bottom
			chatWindow[0].scrollTop = chatWindow[0].scrollHeight;
		},
		trade: function (data) {
			if (data.request) {
				// Trade request from another player
				Game.trade(data.request);
			} else if (data.accept) {
				// Trade accepted, add trade resources
				Game.acceptTrade();
			}
		},
		victory: function () { },
		request: function (data, fn) {
			fn(dataRequest[data.type]());
		},
		update: function () { }
	};
	
	return {
		CONST: CONST,
		// Initialize app phases, state
		init: function () {
			Engine.init();
			Controller.init(io, commands, true, actions);
			// Bundle actions into control groups
			Controller.bundle('pregame', { host: actions.host, join: actions.join, startGame: actions.startGame }, true);
			Controller.bundle('game', { 
				startTurn: actions.startTurn, 
				endTurn: actions.endTurn, 
				build: actions.build, 
				trade: actions.trade, 
				tradeResponse: actions.tradeResponse,
				chat: actions.chat,
				useCard: actions.useCard,
				// Set actions to true if they don't correspond directly to an event
				draw: true
			});
			Controller.bundle('endgame', { cleanup: actions.cleanup, end: actions.end });
			
			Controller.request(['host', 'join']);
		},
		transition: function (o) {
			var from = CONST.views[o.from],
				to = CONST.views[o.to];
			$(from).hide(200);
			$(to).show(200);
		}
	};
})();


$(document).ready(function () {
	app.init();
});
