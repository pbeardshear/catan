//
//	controller.js
//

var Controller = (function () {
	var socket;
	var Commands = {
		// Host a new game
		host: function (o) {
			console.log(o);
			if (o.success) {
				Game.init(o);
			}
		},
		// Join an existing game
		join: function (o) {
			if (o.success) {
				Game.addPlayer(o);
			}
		},
		// List available games
		list: function (o) {
			$.each(o.games, function (i, game) {
				app.apply('host', 'list', [game.name, game.count, game.max]);
			});
		},
		// Send a chat message
		chat: function (data) {
			app.apply('game', 'chat', [data.user, data.message]);
			// Scroll the chat window to the bottom
			chat.scrollTop(chat[0].scrollHeight);
		},
		trade: function (data) {
			Game.startTrade(data);
		},
		// Start a new game
		start: function (o) {
			if (o.success) {
				Game.turnOrder = o.turnOrder;
				Game.startTurn(o);
			}
		},
		startTurn: function (o) {
			Game.startTurn(o);
		},
		endTurn: function (o) {
			Game.endTurn(o);
		},
		// Disconnect from the server
		disconnect: function () { }
	};
	
	// Allowable actions
	var Actions = {
		host: {
			el: '#hostGame form',
			event: 'submit',
			fn: function (e) {
				// Necessary to prevent a page refresh on form submit
				e.preventDefault();
				// Get the form information
				var values = {};
				$.each($(this).serializeArray(), function (i, field) {
					values[field.name] = field.value;
				});
				console.log(values);
				if (values.username && values.game && values.players) {
					// Send the data up to the server
					values.private = values.private == 'on';
					socket.emit('host', values);
				}
				else {
					// One of the fields was blank
				}
			}
		},
		join: {
			
		},
		start: {
			el: '#startGame',
			event: 'click',
			fn: function () {
				// Send up map information to the server
				socket.emit('start');				
			}
		},
		// Swap the position of tiles on the map during initialization
		swap: {
			el: '#board-center area',
			event: 'click',
			fn: function () {
				Engine.swapTiles.call(this);
			}
		},
		// Build a settlement, road, city, or development card
		build: {
			el: '#build .items .button',
			event: 'click',
			fn: function (e) {
				Game.place({ type: $(this).attr('value') });
			}
		},
		// Place a selected game piece on the map
		place: {
			el: null,
			event: 'click',
			fn: function (e) {
				console.log(e.data);
				Engine.placeObject.apply(this, [e.data, e.data.callback, e.data.scope]);
			}
		},
		// Activate a development card
		useCard: {
			el: '#development .items .button',
			event: 'click',
			fn: function (e) {
				// Activate development card
				Game.useCard($(this).val());
			}
		},
		// Trade resources
		trade: {
			el: '#tradeButton',
			event: 'click',
			fn: function (e) {
				// Popup trade menu
				$('#tradePopup').show();
			}
		},
		// Request a trade to another player
		tradeRequest: {
			el: '#tradePopup .actions .button',
			event: 'click',
			fn: function (e) {
				// Possible actions: trade, cancel
				if ($(this).hasClass('trade')) {
					var give = [],
						take = [];
					$('#tradePopup .resources.offer').children().each(function (el) {
						give.push({
							type: $(this).text(),
							amount: $(this).children('input').val()
						});
					});
					$('#tradePopup .resources.obtain').children().each(function (el) {
						take.push({
							type: $(this).text(),
							amount: $(this).children('input').val()
						});
					});
					// Alert the server of the trade
					socket.emit('trade', { give: give, take: take });
				}
				$('#tradePopup').hide();
			}
		},
		// Confirm a trade from another player
		tradeConfirm: {
			el: '#tradeConfirmPopup .actions .button',
			event: 'click',
			fn: function (e) {
				if ($(this).hasClass('trade')) {
					Game.acceptTrade();
				}
				else {
					Game.denyTrade();
				}
				Game.finishTrade();
				$('#tradeConfirmPopup').hide();
			}
		},
		// Use the chat window
		chat: {
			el: '#chat form',
			event: 'submit',
			fn: function (e) {
				// Necessary to prevent a page reload
				e.preventDefault();
				socket.emit('chat', { message: $('#chatMessage').val(), user: 'Peter' });
				// Clear the field
				$('#chatMessage').val('');
			}
		},
		moveRobber: {
			el: '#board-center area',
			event: 'click',
			fn: function (e) {
				e.data.callback(Engine.getTilePosition(this.coords));
			}
		},
		endTurn: {
			el: '#endButton',
			event: 'click',
			fn: function () {
				Game.endTurn();
				socket.emit('endTurn');
			}
		}
	};
	
	return {
		init: function (io) {
			socket = io.connect(app.CONST.IP);
			
			for (var comm in Commands) {
				if (Commands.hasOwnProperty(comm)) {
					socket.on(comm, Commands[comm]);
				}
			}
		},
		// Send the passed command up to the server, along with any optional passed data
		go: function (comm, o) {
			socket.emit(comm, o);
		},
		// Set allowable actions for this player
		activate: function (name, o) {
			var action = Actions[name];
			if (action) {
				$((o && o.el) || action.el).bind((o && o.event) || action.event, o || action.fn, action.fn);
			}
		},
		// Remove actions allowed by the player
		deactivate: function (name, o) {
			var action = Actions[name];
			if (action) {
				$((o && o.el) || action.el).unbind((o && o.event) || action.event);
			}
		},
		changeState: function (state) {
			var imageMap = '#board-' + state;
			// Check if a valid state was passed
			if ($(imageMap).length) {
				$(app.CONST.ID.blank).attr('usemap', imageMap);
			}
		}
	};
})();
