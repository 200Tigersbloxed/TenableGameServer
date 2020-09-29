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

console.log("Server Starting in 5 Seconds...")

setTimeout(function () {
    io.attach(config.serverPort);
    console.log("TenableGameServer Name: " + config.serverName)
    console.log("TenableGameServer Port: " + config.serverPort)
    console.log("TenableGameServer is On!")
}, 5000)

io.on('connection', (socket) => {
	console.log('Connection made');
	
	socket.on('disconnect', () => {
		console.log("Player Left")
		// Lets see whos still here
		previousplayers = players
		io.emit('getplayers')
		// everything else happens in return players
		socket.disconnect();
		// find out who left
		var plrwholeft
		for(x in playerswithsocket){
			if(playerswithsocket[x]["socket"] == socket){
				plrwholeft = playerswithsocket[x]["username"]
			}
		}
		console.log(plrwholeft + " Left the Server")
		// now remove the player that just left from the players table and playerswithsocket array
		const index = players.indexOf(plrwholeft)
		players.splice(index, 1)
		for(x in playerswithsocket){
			if(playerswithsocket[x]["username"] == plrwholeft){
				var plrusername = playerswithsocket[x]["username"]
				playerswithsocket = playerswithsocket.filter(plrusername => playerswithsocket[x]["username"] != plrusername)
			}
		}
	})
	
	socket.on('login', (logindata) => {
		setTimeout(function(){
			if(players.length <= maxplayers){
				if(!inRound){
                    if (!config.whitelist) {
                        console.log("Player " + logindata.username + " has joined the server!")
						players.push(logindata.username)
						playerswithsocket[logindata.username] = {
							"username": logindata.username,
							"socket": socket
						}
                    }
                    else {
						// check if they're whitelisted
						var usersinconfig = config.users
						var approved = false;
						for(plr in usersinconfig){
							if(usersinconfig[plr] == logindata.username){
								// they're good
								approved = true;
							}
						}
						// now we check the var
						if(approved){
							console.log("Player " + logindata.username + " has joined the server!")
							players.push(logindata.username)
							playerswithsocket[logindata.username] = {
								"username": logindata.username,
								"socket": socket
							}
						}
						else{
							console.log("Player " + logindata.username + " attempted to join! (They're not WhiteListed)")
							socket.emit("kick", {"reason": "Not Whitelisted"})
							socket.disconnect()
						}
                    }
				}
				else{
					console.log("round in progress")
					// round is in progress deny player
                    socket.emit("kick", { "reason": "Round In Progress" })
					socket.disconnect()
				}
			}
			else{
				console.log("server full")
				// server is full deny player
                socket.emit("kick", {"reason": "Server Full"})
				socket.disconnect()
			}
		}, 1000)
    })

    socket.on('getServerInfo', () => {
        socket.emit('sendServerInfo', { "serverName": config.serverName, "latestMessage": latestServerMessage })
    })
})