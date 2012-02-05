//
//
//

var Game = (function () {
	// Private state
	var _this = {
		self: null,
		players: [],
		cost: { road: { brick: 1, wood: 1 }, 
				settlement: { brick: 1, wood: 1, grain: 1, wool: 1 }, 
				city: { ore: 3, grain: 2 }, 
				developmentCard: { ore: 1, wool: 1, grain: 1 } 
		}
	};
	
	return {
		// Called on: successful host or join
		init: function (data) {
			// Create getter and setter functions
			base.accessor(this, _this);
			this.set('self', new Player(data));
			this.addPlayers({ count: 1, players: this.get('self') });
		},
		// Set up initial game state (i.e. board, game-specific options)
		// Called on: successful host
		setup: function () {
			Board.init(app.CONST.board.size);
		},
		// Called on: successful addPlayer command
		addPlayers: function (data) {
			var players = this.get('players');
			var playerData = data.players;
			if (playerData instanceof Player) {
				players.push(playerData);
			} else {
				base.each(playerData, function (data) {
					players.push(new Player(data));
				});
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
			this.moveBoard();
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
		// Update the display state of the game
		// Called on: update command, Board place, Board resource harvest
		update: function () { }
	};
})();