//
//	mailer.js
//	A simple bug tracker module for node.js
//	Sends an email to a specified email address whenever a bug occurs
//

var email = require('mailer');
var fs = require('fs');

/*
 *
 *	Exports
 *
 */

// Primary mailer object
Mailer = (function () {
	// Private variables
	var _messageQueue = [];
	
	// Configuration variables
	var config,
		template,
		mailOptions;
	
	return {
		loaded: false,
		// configPath [string] -> path to a config file which specifies the username and password to use for authentication
		// templatePath [string, optional] -> path to a template file to use as the body template for the email
		// options [object, optional] -> additional arguments to use in place of default values when sending an email
		init: function (configPath, templatePath, options) {
			var self = this; 	// Maintain a reference to the outer scope
			fs.readFile(configPath, 'utf-8', function (err, data) {
				if (err) {
					console.error('Config file READ ERROR:', err);
					return;
				}
				// Read the authentication values from the config file
				var lines = data.split('\n');
				config = {
					username: lines[0].match(/^username: *(\w*@\w*\.\w{2,4})/)[1],
					password: lines[1].match(/^password: *(.*)$/)[1]
				};
				
				// Set loading flag
				self.loaded = true;
				console.log('Mailer loaded successfully.');
				// Send all of the messages in the message queue
				for (var i = 0; i < _messageQueue.length; i++) {
					self.send(_messageQueue[i]);
				}
				_messageQueue = [];
			});
			
			template = templatePath || null;
			mailOptions = options || {};
		},
		
		send: function (data) {
			if (this.loaded) {
				email.send({
					host: 'smtp.gmail.com',
					domain: 'smtp.gmail.com',
					port: '465',
					ssl: true,
					to: mailOptions.to || config.username,
					from: mailOptions.from || config.username,
					subject: data.subject,
					body: template ? null : data.body,
					template: template || data.template || null,
					data: data.data || null,
					authentication: 'login',
					username: config.username,
					password: config.password
				},
				function (err, result) {
					if (err) { 
						console.error('Mailer Error:', err); 
					} else { 
						console.log('Mailer sent email successfully.'); 
					}
				});
			} else {
				_messageQueue.push(data);
			}
		},
		
		// Returns a formatted stack trace string that displays better in emails
		formatErrorStack: function (stackTrace) {
			return stackTrace.split('\n').map(function (message, i) {
				var formattedMessage = i != 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;' + message : message;
				return { line: formattedMessage };
			});
		}
	};
})();

