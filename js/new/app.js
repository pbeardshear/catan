//
//	app.js
//

var app = (function () {
	var CONST = {
		views: { host: '#hostPage', setup: '#setupPage', game: '#gamePage' },
		board: { size: 3, height: 620, width: 800, landSize: 57 },
		tile: { img: { size: { x: 100, y: 114 } }, colors: { 'grain': '#FFC500', 'wool': '#B3F36D', 'wood': '#238C47', 'brick': '#BF7130', 'ore': '#AAA', 'desert': '#000', 'port': '#3F92D2'} },
		port: { img: { size: { x: 45, y: 45 } }, locations: { size: { x: 52, y: 23 } } },
		imageOffset: { settlement: { x: 30, y: 30 }, city: { x: 40, y: 40 }, robber: { x: 33, y: 33 } },
		game: { numTypes: 5, numTiles: 19 },
		imagePath: 'images/',
		ID: { canvas: '#map', blank: '#blank', roadCanvas: '#roads', piecesCanvas: '#pieces', robberCanvas: '#robber' },
		IP: window.location.href
	};
	var phases = { };
	// The app manages views that are used pregame
	var views = { };
	// Available games
	var games = [];
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
				values.username = $('#username [name="username"]').val();
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
			App.Players.self.endTurn();
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
		// Deprecated: Development card use is bound to Ember view
		useCard: function (e) {
			// Determine the type of card that was used
		},
		cancel: function () {
			// Close a popup
			$('.popup').hide();
		},
		trade: function (e) {
			// Data required: { id: playerID, request: { give: resourcesToGive, receive: resourcesToReceive } }
			var playerID = $('.tradePartners').find(':checked').attr('value');
			if (!playerID) {
				Game.msg('Select a player to trade with!');
				return;
			}
			else if (playerID == App.Players.self.id) {
				Game.msg('Why would you want to trade with yourself?');
				return;
			}
			playerID = playerID == 'port' ? 'port' : parseInt(playerID);	// TODO: Do this nicer
			var request = { give: {}, receive: {} };
			var resourcesTrading = [];		// Helper structure to simplify resource checking when trading with ports
			var resourcesReceivingCount = 0;
			// Build up the hash of resources to give
			$('.resources.offer').find('input').each(function (i, el) {
				request.receive[el.name] = parseInt(el.value) || 0;
				resourcesReceivingCount += request.receive[el.name];
			});
			// Build up the hash of resources to give
			$('.resources.obtain').find('input').each(function(i, el) {
				request.give[el.name] = parseInt(el.value) || 0;
				if (el.value) {
					resourcesTrading.push(el.name);
				}
			});
			// Check if the user selected a port to trade with
			// If so, we need to do some inference
			if (playerID == 'port') {
				// Get all the ports that the player has access to
				var ports = App.Players.self.ports;
				// Find the resource that they are trading (if there is more than one, we have a problem)
				if (resourcesTrading.length == 1) {
					var resourceName = resourcesTrading[0];
					var count = request.give[resourceName];
					for (var i = 0; i < ports.length; i++) {
						if (ports[i].type == resourceName || ports[i].type == 'any') {
							// One last validation - their request count has to match with the cost ratio of the port
							if (ports[i].count * resourcesReceivingCount == count) {
								Game.acceptTrade(request);
								return;
							}
						}
					}
					// Check against the 4:1 trade (which everyone has)
					if (count == 4 * resourcesReceivingCount) {
						Game.acceptTrade(request);
						return;
					}
					// Couldn't find a matching port
					Game.msg('No port accepts that trade request.');
					return;
				} else {
					// Bad trade
					Game.msg('Invalid trade request for port.');
					return;
				}
			} else {
				Game.trade(request, true);
				Controller.fire('trade', { id: playerID, request: request, sender: App.Players.self.name });
			}
		},
		tradeResponse: function (e)	{
			// Respond to the callback
			Game.tradeResponse($(this).hasClass('acceptTrade'));
			// Clear the response object
			Game.tradeResponse = null;
			App.TradeRequest.endRequest();
			// Controller.fire('trade', { accept: $(this).hasClass('acceptTrade') });
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
				Controller.release('host');
				Controller.release('join');
				//app.transition({ from: 'host', to: 'setup' });
			}
		},
		listGames: function (res) {
			App.Games.set('content', res);
			// base.empty(games);
			// // views.gameList.destroy('class', 'game');
			// // Update the view with the list of games
			// base.merge(games, res);
			// views.gameList.create();
			Controller.detect('join');
		},
		addPlayers: function (res) {
			Game.addPlayers(res);
		},
		setup: function (res) {
			if (res.success) {
				Controller.release('host');
				Controller.release('join');
				//app.transition({ from: 'host', to: 'setup' });
				Controller.request('startGame');
			}
		},
		initPlacement: function (res, fn) {
			console.log('starting initial placement');
			Game.msg('It is your turn to place a settlement and road.');
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
		trade: function (data, fn) {
			if (data.request) {
				// Trade request from another player
				Game.trade(data.request, false, fn);
				// Set up the request data
				App.TradeRequest.newRequest(data.request, data.sender);
				// Show the trade confirm popup
				// TODO: Do this better
				$('#tradeConfirmPopup').show();
			} else if (data.accept) {
				// Trade accepted, add trade resources
				Game.acceptTrade();
			}
		},
		victory: function () {
			
		},
		request: function (req, fn) {
			fn(dataRequest[req.data]());
		},
		update: function (res) {
			// TODO: Do this in a more general way
			if (res.type == 'boardState') {
				// Initialize the board with the full data
				Board.init(res.data);
			} else if (res.type == 'playerState') {
				var playerData = res.data;
				App.Players.updatePlayer(playerData.player, playerData.property, playerData.value);
			} else if (res.type == 'swap') {
				var tiles = res.data;
				Board.swapTiles(tiles[0], tiles[1]);
			} else if (res.type == 'build') {
				Board.placePiece(res.data);
				Game.msg([Game.getPlayer(res.player).name, 'placed a', res.type].join(' '));
			} else if (res.type == 'message') {
				Game.msg(res.data.text);
			}
		},
		
		steal: function (_, fn) {
			// Someone is stealing from you
			// Remove a random resource from your bank and return it
			fn(App.Players.self.takeRandom());
		},
		
		monopoly: function (data, fn) {
			// Return all of your resources
			fn(App.Players.self.takeAll(data.resource));
		},
		
		confirmation: function () {
			$('#confirmationPopup').show();
			setTimeout(function () { $('#confirmationPopup').hide(); }, 2500);
		}
	};
	
	return {
		CONST: CONST,
		// Initialize app phases, state
		init: function () {
			Engine.init();
			Controller.init(io, commands, true, actions);
			// Bundle actions into control groups
			Controller.bundle('pregame', { host: actions.host, join: actions.join, startGame: actions.startGame, listGames: true }, true);
			Controller.bundle('game', { 
				startTurn: actions.startTurn, 
				endTurn: actions.endTurn, 
				build: actions.build, 
				trade: actions.trade, 
				tradeResponse: actions.tradeResponse,
				// chat: actions.chat,
				useCard: actions.useCard,
				// Set actions to true if they don't correspond directly to an event
				draw: true
			});
			Controller.bundle('endgame', { cleanup: actions.cleanup, end: actions.end });
			Controller.request(['host', 'join', 'listGames']);
			
			// Globally namespace the application
			App = Ember.Application.create();
			this.initControllers();
			this.initViews();
			
			// Create pregame views
			views.gameList = new View({
				data: games,
				template: '<tr class="game"><td class="gameName">{name}</td><td>{count}/{max}</td><td><a class="action join button">Join</a></td></tr>',
				el: '#gameList table'
			});
			Controller.fire('listGames');
			$('#mapContainer').draggable();
		},
		
		transition: function (o) {
			var from = CONST.views[o.from],
				to = CONST.views[o.to];
			$(from).hide(200);
			$(to).show(200);
		},
		
		// TODO: Consider moving this function somewhere more appropriate
		initControllers: function () {
			// A simple Ember object which displays an instruction or update message to the user
			App.gameMessage = Ember.Object.create({
				text: ''
			});
			
			// Empty controller for game list, loaded when we get a response from the server with the data
			App.Games = Ember.ArrayController.create();
			App.Players = Ember.ArrayController.create({
				content: [],
				self: null,
				activePlayer: null,		// Represents the player whose turn it currently is
				
				addPlayer: function (player) {
					// Workaround for adding both static and dynamic classes to a DOM element
					player.alwaysTrue = true;
					this.pushObject(player);
				},
				
				updatePlayer: function (id, property, value) {
					this.find(function (player) {
						return player.id == id;
					}).set(property, value);
				}
			});
			
			// Simple object to represent a new trade request
			// Needs to be an Ember object to work with Ember's data binding
			App.TradeRequest = Ember.Object.create({
				active: false,
				give: null,
				receive: null,
				sender: null,
				
				newRequest: function (request, sender) {
					this.set('give', request.give);
					this.set('receive', request.receive);
					this.set('sender', sender);
					this.set('active', true);
				},
				
				endRequest: function () {
					this.set('active', false);
				}
			});
			
			// Array controller which manages the players which are valid targets for stealing
			// after the robber is moved
			App.RobberTargets = Ember.ArrayController.create({
				content: [],
				
				setTargets: function (targets) {
					this.pushObjects(targets);
				},
				
				clearTargets: function () {
					this.removeObjects(this.content);
				}
			});
		},
		
		// TODO: Consider moving this function somewhere more appropriate
		initViews: function () {
			App.GameList = Ember.View.extend({
				games: App.Games,
				join: function (self, event) {
					// TODO: Think of a better way to abstract this, preferably through the controller
					actions.join.call(event.target, event);
				}
			});
			
			App.RobberList = Ember.View.extend({
				// Handlers
				steal: function (self, event) {
					var id = $(event.target).attr('value');
					// 0 is a valid id...
					if (id != undefined) {
						// TODO: Work with controller on this
						Controller.emit('steal', { player: parseInt(id) }, function (resource) {
							// Add the stolen resource to the player
							App.Players.self.updateResources(resource);
						});
						$('#stealPopup').hide();
					} else {
						Game.msg('Not a valid selection.');
						return false;
					}
				}
			});
			
			// More of a controller, just handles the use action, passing off to Player.useCard
			App.DevelopmentCards = Ember.View.extend({
				use: function (self, event) {
					App.Players.self.useCard(event.target.getAttribute('value'));
				}
			});
			
			App.Popup = Ember.Object.create({
				header: null,
				subheader: null,
				
				useCard: function (cardType) {
					switch (cardType) {
						case 'plenty':
							this.set('header', 'Year of Plenty');
							this.set('subheader', 'Choose a resource to add:');
							break;
						case 'monopoly':
							this.set('header', 'Resource Monopoly');
							this.set('subheader', 'Choose a resource to monopolize:');
							break;
					}
				}
			});
			
			App.PopupView = Ember.View.extend();
			
			App.ResourceTrade = Ember.View.extend({
				trade: function (self, event) {
					actions.trade.call(event.target, event);
					$('#tradePopup').hide();
				},
				
				cancel: function () {
					// Close the trade window
					$('#tradePopup').hide();
				},
				
				response: function (self, event) {
					actions.tradeResponse.call(event.target, event);
					$('#tradeConfirmPopup').hide();
				}
			});
		}
	};
})();


$(document).ready(function () {
	app.init();
	
	// Bind some simple event listeners to the bottom footer
	$('#reportBug').bind('click', function () {
		$('#reportBugPopup').show();
	});
	$('#requestFeature').bind('click', function () {
		$('#requestPopup').show();
	});
	
	// Handle submission
	var submitHandler = function (e) {
		e.preventDefault();
		var form = $(this).closest('form');
		var payload = {};
		$.each(form.children('.formField'), function (i, child) {
			payload[child.name] = child.value;
		});
		Controller.emit('userSubmit', payload);
		$(this).closest('.popup').hide();
	};
	$('#submitFeature').bind('click', submitHandler);
	$('#submitBug').bind('click', submitHandler);
	
	// Set up a general cancel handler
	$('.popup .cancel').bind('click', function () {
		$(this).closest('.popup').hide();
	});
});
