//
//
//

var Game = (function () {
	// Private state
	var _this = {
		self: null,
		players: [],
		playerState: [],	// A more readable structure for the state of the players
		views: {},
		cost: { 
			road: { brick: 1, wood: 1 }, 
			settlement: { brick: 1, wood: 1, grain: 1, wool: 1 }, 
			city: { ore: 3, grain: 2 }, 
			developmentCard: { ore: 1, wool: 1, grain: 1 } 
		},
		cardNames: {
			knight: 'Knight',
			plenty: 'Year of Plenty',
			monopoly: 'Monopoly',
			roadBuild: 'Road Building',
			victory: 'Library'
		}
	};
	
	// Development cards
	var developmentCards = {
		knight: function () {
			// Move robber
			// Then, steal from a player adjacent
			Board.moveRobber(function (players) {
				App.RobberTargets.setTargets(players);
				$('#stealPopup').show();
			});
		},
		plenty: function () {
			// Bring up popup for user to select two resources
			// Add those resources
			// We are reappropriating the monopoly popup for Year of Plenty as well
			App.Popup.useCard('plenty');
			$('#monopolyPopup').show();
			Controller.bindOnce('.action.monopoly', 'click', function (e) {
				var resourceName = this.innerHTML;
				if (resourceName) {
					Controller.bindOnce('.action.monopoly', 'click', function (e) {
						var nextResourceName = this.innerHTML;
						if (nextResourceName) {
							var resources = {};
							if (resourceName == nextResourceName) {
								resources[resourceName.toLowerCase()] = 2;
							} else {
								resources[resourceName.toLowerCase()] = 1;
								resources[nextResourceName.toLowerCase()] = 1;
							}
							App.Players.self.updateResources(resources);
							$('#monopolyPopup').hide();
						} else {
							Game.msg('Not a valid selection.');
						}
					});
				} else {
					Game.msg('Not a valid selection.');
				}
			});
		},
		monopoly: function () {
			// Bring up popup for user to select one resource
			// Remove all resources of that type from each player
			// Give those resources to this player
			App.Popup.useCard('monopoly');
			$('#monopolyPopup').show();
			Controller.bindOnce('.action.monopoly', 'click', function (e) {
				var resource = this.innerHTML;
				if (resource) {
					Controller.emit('monopoly', { resource: resource.toLowerCase() }, function (resource) {
						App.Players.self.updateResources(resource);
					});
					$('#monopolyPopup').hide();
				} else {
					Game.msg('Not a valid selection.');
					return false;
				}
			});
		},
		roadBuild: function () {
			// Popup message telling user to place two roads
			// Tell board that user is placing roads
			var self = Game.get('self');
			Game.msg('Place two roads.');
			Controller.update({
				dest: 'client',
				self: false,
				type: 'message',
				data: {
					text: self.name + " played 'Road Building'!"
				}
			});
			Board.beginPlace(self, 'road', false, function () {
				Board.beginPlace(self, 'road', false);
			});
		},
		victory: function () {
			// Popup message telling user that they can't use victory cards
			Game.msg('You can\'t use a victory card.');
			return false;
		}
	};
	
	return {
		// Called on: successful host or join
		init: function (data) {
			// Create getter and setter functions
			base.accessor(this, _this);
			data.isSelf = true;
			var self = Player.create(data);
			this.set('self', self);
			// TODO: Think of a better way to do this
			App.Players.set('self', self);
		},
		// Set up initial game state (i.e. board, game-specific options)
		// Called on: successful host
		setup: function () {
			Board.init(app.CONST.board.size);
			Controller.request('swap');
		},
		getPlayer: function (id) {
			var players = this.get('players');
			for (var i = 0; i < players.length; i++) {
				if (players[i].get('id') == id) {
					return players[i];
				}
			}
		},
		// Called on: successful addPlayer command
		addPlayers: function (data) {
			var _this = this;
			var self = this.get('self');
			var views = this.get('views');
			if (data instanceof Player) {
				this.get('players').push(data);
				// TODO: Deprecate this
				this.get('playerState').push(data.getState());
				App.Players.addPlayer(data);
				// views.playerPreview.create([data.getState()]);
			} else if (base.isArray(data)) {
				base.each(data, function (o) {
					var player = Player.create(o);
					// var player = new Player(o);
					_this.addPlayers(player);
				});
			} else {
				// this.addPlayers(new Player(data));
				this.addPlayers(Player.create(data));
			}
		},
		// Called on: build action
		build: function (type) {
			var _this = this;
			var self = this.get('self');
			if (self.canBuild(type)) {
				// Proceed
				if (type != 'developmentCard') {
					Board.beginPlace(self, type, false, function (piece) {
						// Remove the resources from the player
						var cost = _this.get('cost')[type];
						var negatedCost = {};
						base.each(cost, function (amt, name) {
							negatedCost[name] = -amt;
						});
						self.updateResources(negatedCost);
					});
				} else {
					self.drawCard();
					// Remove the resources from the player
					var cost = _this.get('cost')[type];
					var negatedCost = {};
					base.each(cost, function (amt, name) {
						negatedCost[name] = -amt;
					});
					self.updateResources(negatedCost);
				}
			} else {
				this.msg('You don\'t have enough resources to build that.');
			}
		},
		// Update the game state from the server, move to game view
		// Called on: successful start command
		begin: function () {
			var playerState = this.get('playerState');
			this.moveBoard();
			Board.beginGame();
			// Create the views to house the game displays
			var self = this.get('self');
			// views.players.create();
			// Transition the view to game
			app.transition({ from: 'setup', to: 'game' });
			// TODO: Move this somewhere more appropriate
			$('#tradeButton').click(function (e) {
				$('#tradePopup').toggle();
			});
			// Change the current action bundle
			Controller.swapTo('game');
			Engine.drawRobber();
			// Bind event listener to chat submit
			// TODO: Do this in a better way using the Controller
			$('#chat .chat').bind('submit', function (e) {
				e.preventDefault();
				// Data required: { player: playerName, message: chatMessage }
				var playerName = Game.get('self').get('name');
				var chatMessage = $('#chatMessage').val();
				Controller.emit('chat', { player: playerName, message: chatMessage });
				// Clear the text field
				$('#chatMessage').val('');
			});
		},
		// Request control and begin the turn
		// Called on: successful startTurn command
		startTurn: function (data) {
			var roll = data.roll;
			var self = this.get('self');
			// Check if we receive any resources from this roll
			Board.harvestResources(self, roll);
			var player = this.getPlayer(data.turn);
			if (App.Players.activePlayer) {
				App.Players.activePlayer.set('isTurn', false);
			}
			App.Players.activePlayer = player;
			player.set('isTurn', true);
			
			// Check if it is our turn
			if (App.Players.self.isTurn) {
				// Our turn!
				this.msg('It is your turn.');
				self.startTurn();
			}
		},
		// Release control and end the turn, or build between turns
		// Called on: endTurn action, or successful startTurn command
		endTurn: function () { },
		// Called on: successful game start (Game.begin)
		moveBoard: function () {
			$('#mapContainer').appendTo('#mapPane');
		},
		// Displays the event notice, and updates its text
		// Called on: user interaction
		msg: function (text, location) {
			if (location == 'chat') {
				// Post update message to the chat log
				var template = ['<p class="systemChat">', text, '</p>'].join('');
				var chatWindow = $('#chatLog .wrap');
				chatWindow.append(template);
				// Scroll the chat window to the bottom
				chatWindow.scrollTop = chatWindow[0].scrollHeight;
			} else {
				// Default: Show the message in the event notice dropdown
				App.gameMessage.set('text', text);
				setTimeout(function () { App.gameMessage.set('text', null); }, 3000);
			}
		},
		// Called on: trade command, request property
		trade: function (request, sender, tradeCallback) {
			var give = request.give,
				receive = request.receive;
			this.tradeRequest = sender ? { give: give, receive: receive } : { give: receive, receive: give };
			// Save a reference to the callback that contains the response message to the server
			this.tradeResponse = tradeCallback;
		},
		// Called on: trade command, accept property
		acceptTrade: function (request) {
			if (request) {
				this.tradeRequest = request;
			}
			// Negate the give
			// TODO: Should probably create a method to abstract this away
			var tradeCost = {};
			base.each(this.tradeRequest.give, function (amt, name) {
				tradeCost[name] = -amt;
			});
			this.get('self').updateResources(tradeCost);
			this.get('self').updateResources(this.tradeRequest.receive);
			this.tradeRequest = null;
			Game.msg('Trade accepted!');
		},
		// Called on: player.useCard
		useCard: function (card) {
			return developmentCards[card]();
		},
		// Update the display state of the game
		// Called on: update command, Board place, Board resource harvest
		update: function () { }
	};
})();