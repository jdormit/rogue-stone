var express = require('express');
var app = express();
var io = require('socket.io');
var server = require('http'.createServer(app));

var port = process.env.PORT || 8080;



server.listen(port);