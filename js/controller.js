//
//	controller.js
//

var Controller = (function () {
	var socket;
	var Commands = {
		// Host a new game
		host: function (o) {
			console.log(o);
		},
		// Join an existing game
		join: function () { },
		// List available games
		list: function (o) {
			var template = '<tr><td>{0}</td><td>{1}/6</td><td><a class="join button">Join</a></td></tr',
				gameList = $('#gameList table'),
				games = "";
			$.each(o.games, function (i, game) {
				games += template.replace('{0}', game.name).replace('{1}', game.count);
			});
			gameList.append(games);
		},
		// Send a chat message
		chat: function (data) {
			var template = '<p><em class="name">{0}:</em>{1}</p>',
				chat = $('#chatLog .wrap');
			template = template.replace('{0}', data.user).replace('{1}', data.message);
			chat.append(template);
			// Scroll the chat window to the bottom
			chat.scrollTop(chat[0].scrollHeight);
		},
		trade: function (data) {
			Game.startTrade(data);
		},
		// Start a new game
		start: function (s) {
			Game.init(s);
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
				e.preventDefault();
				// Get the form information
				console.log(e);
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
			fn: function (o) {
				Engine.placeObject.apply(this, [o, o.callback, o.scope]);
			}
		},
		// Activate a development card
		useCard: {
			el: '#development .items .button',
			event: 'click',
			fn: function (e) {
				// Activate development card
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
		}
	};
	
	// Private methods
	function changeSelectionState (state) {
		console.log(state);
		var imageMap = '#board-' + state;
		// Check if a valid state was passed
		if ($(imageMap).length) {
			$(app.CONST.blankID).attr('usemap', imageMap);
		}
	}
	
	return {
		init: function (io) {
			socket = io.connect('192.168.1.112:1337');
			
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
			var action = Actions[name],
				fn = (o ? action.fn.createDelegate(o.scope, o) : action.fn);
			if (action) {
				$(((o && o.el) || action.el)).bind(((o && o.event) || action.event), fn);
			}
			if (o && o.state) {
				changeSelectionState(o.state);
			}
		},
		// Remove actions allowed by the player
		deactivate: function (name) {
			var action = Action[name];
			if (action) {
				$(action.el).unbind(action.event);
			}
		}
	};
})();
