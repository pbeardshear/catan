var url = require('url'),
	path = require('path'),
	fs = require('fs');
	

// -- Constants
var defaultUri = 'index.html';
var mimeType = {
	'html': 'text/html',
	'gif': 'image/gif'
};

// -- Private methods
function loadFile (uri, response) {
	console.log('the url is', uri);
	var filename = path.join(process.cwd(), (uri.match(/\/$/) ? (uri + defaultUri) : uri)),
		extension = (filename.match(/\.[a-zA-Z]*$/) ? filename.split('.')[1] : 'text/html');
	console.log(filename);
	path.exists(filename, function (exists) {
		console.log('exists: ' + exists);
		if (exists) {
			console.log(extension);
			fs.readFile(filename, "binary", function (err, file) {
				if (!err) {
					response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
					response.write(file, "binary");
					response.end();
					return;
				}
				else {
					response.writeHead(500, { 'Content-type': 'text/html', 'Access-Control-Allow-Origin': '*' });
					response.write("Error reading file.");
					response.end();
				}
			});
		}
		else {
			// File doesn't exist
			response.writeHead(404, {});
			response.write("File not found.");
			response.end();
		}
	});	
}

// -- Expose module
var fileserver = {};
fileserver.load = function (uri, res) {
	loadFile(uri, res);
};

module.exports = fileserver;