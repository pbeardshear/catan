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
				Controller.bindOnce('.action.steal', 'click', function (e) {
					// Determine the selected player's id
					var id = $(this).attr('value');
					// 0 is a valid id...
					if (id != undefined) {
						// TODO: Work with controller on this
						Controller.emit('steal', { player: id }, function (resource) {
							// Add the stolen resource to the player
							App.Players.self.updateResources(resource);
						});
						$('#stealPopup').hide();
					} else {
						Game.msg('Not a valid selection.');
						return false;
					}
				});
			});
		},
		plenty: function () {
			// Bring up popup for user to select two resources
			// Add those resources
		},
		monopoly: function () {
			// Bring up popup for user to select one resource
			// Remove all resources of that type from each player
			// Give those resources to this player
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
			// Create the player preview view
			this.get('views').playerPreview = new View({
				data: this.get('playerState'),
				template: '<li><div class="player"><div class="colorSquare {color}"></div><span>{name}</span></div></li>',
				el: '#playerList ul'
			});
			this.addPlayers(self);
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
			// Create the views to house the game displays
			var self = this.get('self');
			var views = this.get('views');
			// views.resources = new View({
				// el: '#resources .items',
				// attr: 'class',
				// data: self.get('resources')
			// });
			// views.developmentCards = new View({
				// el: '#development .items',
				// attr: 'value',
				// data: self.get('developmentCards'),
				// template: '<li><a href="" class="button" value="{name}">{fullName}</a></li>',
				// fn: base.fn.delegate(this, function (cards) {
					// var fullNames = this.get('cardNames');
					// var ret = { };
					// base.each(cards, function (val, field) {
						// if (val == 1) {
							// ret[field] = fullNames[field];
						// } else if (val > 1) {
							// ret[field] = [fullNames[field], val].join(' x ');
						// } else {
							// ret[field] = null;
						// }
					// });
					// return ret;
				// })
			// });
			// views.players = new View({
				// el: '#playerInfo',
				// attr: 'class',
				// data: playerState,
				// template: '<tr class="{color}"><td class="name">{name}</td><td class="achievement">{achievement}</td>' +
							// '<td class="resource"><em>R: </em><a class="resourceCount">{resourceCount}</a></td>' +
							// '<td class="development"><em>D: </em><a class="developmentCount">{developmentCount}</a></td>' +
							// '<td class="victory"><em>V: </em><a class="victoryPoints">{victoryPoints}</a></td>' + 
							// '</tr>'
			// });
			
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
		},
		// Request control and begin the turn
		// Called on: successful startTurn command
		startTurn: function (data) {
			var roll = data.roll;
			var self = this.get('self');
			// Check if we receive any resources from this roll
			Board.harvestResources(self, roll);
			// Check if it is our turn
			if (self.get('id') == data.turn) {
				// Our turn!
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
		msg: function (text) {
			App.gameMessage.set('text', text);
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