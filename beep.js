var fs = require('fs')

var config;
fs.readFile('config.json', 'utf8', function (err, data) {
    if (err) { console.log("ERROR: " + err.ToString()) }
    config = JSON.parse(data)
})

// game stuff
var players = []
var maxplayers = 45
var inRound = false
var minplayers = 3
var latestServerMessage = "test"

// socket stuff
var playerswithsocket = []

var io = require('socket.io')({
	transports: ['websocket'],
});

function getPlayerNameFromSocket(socket){
	for(x in playerswithsocket){
		if(playerswithsocket[x]["socket"] == socket){
			return playerswithsocket[x]["username"]
		}
	}
	return undefined
}

function getSocketFromPlayerName(username){
	for(x in playerswithsocket){
		if(playerswithsocket[x]["username"] == username){
			return playerswithsocket[x]["socket"]
		}
	}
	return undefined
}

function PlayerJoinedSetup(socket){
	socket.emit("PJSplayers", {"players": players})
}

console.log("Server Starting in 5 Seconds...")

setTimeout(function () {
    console.log("TenableGameServer Name: " + config.serverName)
	console.log("TenableGameServer Port: " + config.serverPort)
	io.attach(config.serverPort);
	console.log("TenableGameServer is On!")
	maxplayers = config.maxplayers
	minplayers = config.minplayers
}, 5000)

io.on('connection', (socket) => {
	socket.on('disconnect', () => {
		// Lets see whos still here
		previousplayers = players
		io.emit('getplayers')
		// find out who left
		var plrwholeft = getPlayerNameFromSocket(socket)
		console.log(plrwholeft + " Left the Server")
		socket.broadcast.emit("playerleft", {"target": plrwholeft})
		// now remove the player that just left from the players table and playerswithsocket array
		const index = players.indexOf(plrwholeft)
		players.splice(index, 1)
		delete playerswithsocket[plrwholeft]
		// everything else happens in return players
		socket.disconnect();
	})

	socket.on('connectiontest', () => {
		socket.emit('connectiontest', {"result": true})
	})
	
	socket.on('login', (logindata) => {
		setTimeout(function(){
			if(players.length <= maxplayers){
				if(!inRound){
                    if (!config.whitelist) {
                        console.log(logindata.username + " has joined the server!")
						players.push(logindata.username)
						playerswithsocket[logindata.username] = {
							"username": logindata.username,
							"socket": socket
						}
						socket.broadcast.emit("playerjoined", {"player": logindata.username})
						PlayerJoinedSetup(socket)
                    }
                    else {
						// check if they're whitelisted
						var usersinconfig = config.users
						var approved = false
			    		var ldusn = logindata.username
						for(plr in usersinconfig){
							if(usersinconfig[plr].toLowerCase() == ldusn.toLowerCase()){
								// they're good
								approved = true;
							}
						}
						// now we check the var
						if(approved){
							console.log(logindata.username + " has joined the server!")
							players.push(logindata.username)
							playerswithsocket[logindata.username] = {
								"username": logindata.username,
								"socket": socket
							}
							socket.broadcast.emit("playerjoined", {"player": logindata.username})
							PlayerJoinedSetup(socket);
						}
						else{
							console.log(logindata.username + " attempted to join! (They're not WhiteListed)")
							socket.emit("kick", {"reason": "Not Whitelisted"})
							socket.disconnect()
						}
                    }
				}
				else{
					// round is in progress deny player
                    socket.emit("kick", { "reason": "Round In Progress" })
					socket.disconnect()
				}
			}
			else{
				// server is full deny player
                socket.emit("kick", {"reason": "Server Full"})
				socket.disconnect()
			}
		}, 1000)
    })

    socket.on('getServerInfo', () => {
        socket.emit('sendServerInfo', { "serverName": config.serverName, "latestMessage": latestServerMessage })
	})

	// moderation controllers
	socket.on('warn', (warndata) => {
		var target = warndata.target
		var reason = warndata.reason
		var targetsocket = getSocketFromPlayerName(target)

		var usersinconfig = config.admins
		var isadmin = false
		var ldusn = warndata.username
		for(plr in usersinconfig){
			if(usersinconfig[plr].toLowerCase() == ldusn.toLowerCase()){
				// they're good
				isadmin = true;
			}
		}

		if(isadmin){
			targetsocket.emit('warn', { "reason": reason })
		}
		else{
			socket.emit('failtowarn', { "reason": "Failed to Send Warning: You're not an Admin!" })
		}
	})

	socket.on('kick', (warndata) => {
		var target = warndata.target
		var reason = warndata.reason
		var targetsocket = getSocketFromPlayerName(target)

		var usersinconfig = config.admins
		var isadmin = false
		var ldusn = warndata.username
		for(plr in usersinconfig){
			if(usersinconfig[plr].toLowerCase() == ldusn.toLowerCase()){
				// they're good
				isadmin = true;
			}
		}

		if(isadmin){
			targetsocket.emit('kick', { "reason": reason })
			setTimeout(function(){
				targetsocket.disconnect();
			}, 1000)
		}
		else{
			socket.emit('failtokick', { "reason": "Failed to Kick User: You're not an Admin!" })
		}
	})
	
	// chat controller
	socket.on('sendchatmessage', (messagedata) => {
		// when a client sends a message
		var sender = messagedata.username
		var message = messagedata.msg

		console.log(sender + "> " + message);
		io.emit('getchatmessage', { "sender": sender, "msg": message })
	})
})