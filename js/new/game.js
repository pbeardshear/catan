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
		cost: { road: { brick: 1, wood: 1 }, 
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
		},
		plenty: function () {
			// Bring up popup for user to select two resources
			// Add those resources
		},
		monopoly: function () {
			// Bring up popup for user to select one resource
			// Remove all resources of that type from each player
			// Give those resources to this player
		},
		roadBuild: function () {
			// Popup message telling user to place two roads
			// Tell board that user is placing roads
		},
		victory: function () {
			// Popup message telling user that they can't use victory cards
		}
	};
	
	return {
		// Called on: successful host or join
		init: function (data) {
			// Create getter and setter functions
			base.accessor(this, _this);
			this.set('self', new Player(data));
			// Create the player preview view
			this.get('views').playerPreview = new View({
				data: this.get('playerState'),
				template: '<li><div class="player"><div class="colorSquare {color}"></div><span>{name}</span></div></li>',
				el: '#playerList ul'
			});
			this.addPlayers(this.get('self'));
		},
		// Set up initial game state (i.e. board, game-specific options)
		// Called on: successful host
		setup: function () {
			Board.init(app.CONST.board.size);
		},
		// Called on: successful addPlayer command
		addPlayers: function (data) {
			var _this = this;
			var self = this.get('self');
			var views = this.get('views');
			if (data instanceof Player) {
				this.get('players').push(data);
				this.get('playerState').push(data.getState());
				views.playerPreview.create([data.getState()]);
			} else if (base.isArray(data)) {
				base.each(data, function (o) {
					var player = new Player(o);
					_this.addPlayers(player);
				});
			} else {
				this.addPlayers(new Player(data));
			}
		},
		// Called on: build action
		build: function (type) {
			if (this.get('self').canBuild(type)) {
				// Proceed
			} else {
				this.msg('You don\'t have enough resources to build that');
			}
		},
		// Update the game state from the server, move to game view
		// Called on: successful start command
		begin: function () {
			var playerState = this.get('playerState');
			/*
			base.each(this.get('players'), function (player) {
				playerState.push(player.getState());
			});
			*/
			this.moveBoard();
			// Create the views to house the game displays
			var self = this.get('self');
			var views = this.get('views');
			views.resources = new View({
				el: '#resources .items',
				attr: 'class',
				data: self.get('resources')
			});
			views.developmentCards = new View({
				el: '#development .items',
				attr: 'value',
				data: self.get('developmentCards'),
				template: '<li><a href="" class="button" value="{name}">{fullName}</a></li>',
				fn: base.fn.delegate(this, function (cards) {
					var fullNames = this.get('cardNames');
					var ret = { };
					base.each(cards, function (val, field) {
						if (val == 1) {
							ret[field] = fullNames[field];
						} else if (val > 1) {
							ret[field] = [fullNames[field], val].join(' x ');
						} else {
							ret[field] = null;
						}
					});
					return ret;
				})
			});
			views.players = new View({
				el: '#playerInfo',
				attr: 'class',
				data: playerState,
				template: '<tr class="{color}"><td class="name">{name}</td><td class="achievement">{achievement}</td>' +
							'<td class="resource"><em>R: </em><a class="resourceCount">{resourceCount}</a></td>' +
							'<td class="development"><em>D: </em><a class="developmentCount">{developmentCount}</a></td>' +
							'<td class="victory"><em>V: </em><a class="victoryPoints">{victoryPoints}</a></td>' + 
							'</tr>'
			});
			
			views.players.create();
			// Transition the view to game
			app.transition({ from: 'setup', to: 'game' });
			// Change the current action bundle
			Controller.swapTo('game');
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
			var notice = $('#eventNotice p');
			notice.text(text);
		},
		// Called on: trade command, request property
		trade: function (request, sender) {
			var give = request.give,
				receive = request.receive;
			this.tradeRequest = sender ? { give: give, receive: receive } : { give: receive, receive: give };
		},
		// Called on: trade command, accept property
		acceptTrade: function () {
			self.addResources(this.tradeRequest.receive);
		},
		// Called on: player.useCard
		useCard: function (card) {
			developmentCards[card]();
		},
		// Update the display state of the game
		// Called on: update command, Board place, Board resource harvest
		update: function () { }
	};
})();