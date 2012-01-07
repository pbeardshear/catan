var app = (function () {
	// State variables
	var players,
		landCount,
		lands = [];
	
	/* 
	 *	Reinitialize the state of game
	 * 	Values provided are specified by the player
	 * 	If none are specified, default values are used
	 */
	function initState (game) { }
	/*
	 *	Perform simple form validation on the settings fields
	 */
	function validateSettings () {
		
	}
	
	return {
		// Utility functions
		namespace: function (name) {
			window[name] = { };
		},
		// Initialize state for a new game
		init: function () {
			// Initialize the game engine
			Engine.init();
			Engine.drawMap(4);
		},
		
		// Joining a game
		pollGames: function () { },
		joinGame: function () { },
		viewGame: function () { },
		
		// Begin a new game
		initGame: function () { 
			// Display the game config settings
			if (validateSettings()) {
				// Continue with game setup
				// TODO STEPS:
				//	1. Draw map
				//	2. Allow user to adjust or accept current map
				//	3. If map accepted, roll to see first player
				//		to place initial settlement/road
				//  4. Continue to each player in reverse round robin, until every player has placed two settlements/roads
				//	5. Hand control off to startGame()
				Engine.drawMap();
				
			}
		},
		
		// Begin a new game.
		// Assumes that initGame has just been called, and all state variables are set up
		// Initializes the game interface, and 
		startGame: function () { },
		startTurn: function () { },
		endTurn: function () { },
		cleanup: function () { },
		
		// Victory, end the game
		finish: function () { },
		
		
		// Getters
		currentPlayer: 0
	};
})();
