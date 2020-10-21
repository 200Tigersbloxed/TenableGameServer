var fs = require('fs');
const { clearInterval } = require('timers');

var config;
fs.readFile('config.json', 'utf8', function (err, data) {
    if (err) { console.log("ERROR: " + err.ToString()) }
    config = JSON.parse(data)
})

// rules stuff
var kickPlayersOnDetectedCheat = true;
var hideGlobalModerationReasons = false;

// game stuff
var players = []
var maxplayers = 45
var minplayers = 3
var latestServerMessage = "test"
var inRound = false
var startingRound = false
var host
var hostSocket
var hostQuestion = undefined
var hostChecking = false
var currentPlayer = undefined
var playerIsAnswering = false
var playerAnswer
var playerswhovehadturn = []

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

function sendServerMessage(message){
	latestServerMessage = message;
	io.emit("serverMessage", { "message": latestServerMessage})
}

function kickPlayer(targetSocket, reason){
	targetsocket.emit('kick', { "reason": reason })
	setTimeout(function(){
		targetsocket.disconnect();
	}, 1000)
	if(hideGlobalModerationReasons){
		sendServerMessage(getPlayerNameFromSocket(targetSocket) + " was kicked from the server.")
	}
	else{
		sendServerMessage(getPlayerNameFromSocket(targetSocket) + " was kicked from the server for reason: " + reason)
	}
}

function CheckForDuplicatePlayer(playername){
	for(var k in players){
		if(playername.toLowerCase() == players[k].toLowerCase()){
			return true
		}
	}
	return false
}

function PickNewPlayer(){
	var theplayerlisttopickfrom = players
	for(var i = 0; i < playerswhovehadturn.length; i++){
		delete theplayerlisttopickfrom[i]
	}
	delete theplayerlisttopickfrom[host]
	var randomElement = Math.floor(Math.random() * theplayerlisttopickfrom.length)
	
	playerswhovehadturn.push(players[randomElement])
	return players[randomElement]
}

function EndPlayerTurn(playername){
	var playersocket = getSocketFromPlayerName(playername)
	currentPlayer = undefined
	playerIsAnswering = false
}

console.log("Server Starting in 5 Seconds...")

setTimeout(function () {
    console.log("TenableGameServer Name: " + config.serverName)
	console.log("TenableGameServer Port: " + config.serverPort)
	io.attach(config.serverPort);
	console.log("TenableGameServer is On!")
	maxplayers = config.maxplayers
	minplayers = config.minplayers
	kickPlayersOnDetectedCheat = config.kickPlayersOnDetectedCheat
	hideGlobalModerationReasons = config.hideGlobalModerationReasons
	// min players 1 or below will break game
	if(minplayers <= 1){
		minplayers = 2
		console.log("WARN: config minplayers cannot go below 2. Doing this will break the server.")
	}
	if(!kickPlayersOnDetectedCheat){
		console.log("WARN: kickPlayersOnDetectedCheat is disabled. This is recommended as it'll remove players who are messing with the server by sending custom socket messages. Consider enabling this in the config to prevent this.")
	}
}, 5000)

// game loop check
var gameLoopInterval = setInterval(function(){
	// loops every 10 ms
	if(!inRound){
		if(players.length >= minplayers){
			// there's enough players to start the round
			// check to see if we've already started the round
			if(!startingRound){
				BeginStartRound()
			}
		}
	}
	else{
		// a round is happening, check variables
		if(hostQuestion == undefined){
			// no host question yet, wait please
		}
		else{
			if(playerIsAnswering){
				if(playerAnswer == undefined){
					// they're still answering
				}
				else{
					io.emit("checkAnswer", {"answer": playerAnswer})
					playerIsAnswering = false
				}
			}
			else{
				// we need a new player
				var selectedPlayer = PickNewPlayer()
				currentPlayer = selectedPlayer
			}
		}
	}
}, 10);

function BeginStartRound(){
	startingRound = true;
	sendServerMessage("Starting round in 5 seconds...")
	setTimeout(function (){
		sendServerMessage("Starting...")
		StartRound()
	}, 5000)
}

function StartRound(){
	if(players.length >= minplayers){
		// pick a host
		var hostindex = Math.floor(Math.random * players.length)
		host = players[hostindex]
		hostSocket = getSocketFromPlayerName(host)
		io.emit("startround", {"host": host})
		inRound = true
		// yes this should be the same as the else down there
		startingRound = false
	}
	else{
		// Can't start round, someone left
		startingRound = false;
	}
}

function EndRound(){
	inRound = false
	startingRound = false
	host = undefined
	hostSocket = undefined
	hostQuestion = undefined
	hostChecking = false
	currentPlayer = undefined
	playerIsAnswering = false
	playerAnswer = undefined
	playerswhovehadturn = []
	sendServerMessage("Timeout for 30 Seconds")
	setTimeout(function(){
		BeginStartRound()
	}, 30000)
}

io.on('connection', (socket) => {
	socket.on('disconnect', () => {
		// Lets see whos still here
		previousplayers = players
		io.emit('getplayers')
		// find out who left
		var plrwholeft = getPlayerNameFromSocket(socket)
		// check if they were in a round
		if(currentPlayer.toLowerCase() == plrwholeft.toLowerCase()){
			// yep so lets fix stuff
			EndPlayerTurn(plrwholeft)
			delete playerswhovehadturn[plrwholeft]
			// thats it
		}
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
					if(!CheckForDuplicatePlayer){
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
								kickPlayer(socket, "You are not whitelisted on this server!")
							}
						}
					}
					else{
						// a player with this name exists
						kickPlayer(socket, "Signed into server on another device. Please try again later.")
					}
				}
				else{
					// round is in progress deny player
                    kickPlayer(socket, "There is currently a Round In Progress! Try again later.")
				}
			}
			else{
				// server is full deny player
                kickPlayer(socket, "The server is currently full. Try again later.")
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
			kickPlayer(targetsocket, reason)
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

	// answer controller
	socket.on('answerSubmitted', (messagedata) => {
		// an answer was submitted
		var isHostAnswerString = messagedata.isHostAnswer
		var answer = messagedata.answer
		var userSubmitted = getPlayerNameFromSocket(socket)

		var isHostAnswer = false;

		if(isHostAnswerString == "yes"){isHostAnswer = true}

		if(isHostAnswer){
			// checks time!
			// check if player is the host
			if(userSubmitted.toLowerCase() == host.toLowerCase()){
				// okay the host sent this
				// make sure the question hasn't already been submitted
				if(hostQuestion != undefined){
					// okay there's no question
					hostQuestion = answer
					io.emit('hostQuestion', {"question": hostQuestion})
				}
				else{
					// it's not a question its a response answer
					if(answer == "wrong"){
						// the answer is wrong LMAOOOO YOU SUCK AT TENABLE
						io.emit('answerSubmitted', {"isRight": "no", "answer": answer})
					}
					else{
						// the answer is right, good job
						io.emit('answerSubmitted', {"isRight": "yes", "answer": answer})
					}
				}
			}
			else{
				// player is not host
				// they're cheating, get em' out of here, unless u don't want them gone
				if(kickPlayersOnDetectedCheat){
					kickPlayer(socket, "Server Detected Cheats.")
				}
			}
		}
		else{
			// this is a player question
			// checks time!
			// check if the user is the currentPlayer
			if(userSubmitted.toLowerCase() == currentPlayer.toLowerCase()){
				// check passed
				// check if there is currently a question
				if(playerIsAnswering){
					// check passed
					playerAnswer = answer
				}
			}
			else{
				// stupid hackers omg
				if(kickPlayersOnDetectedCheat){
					kickPlayer(socket, "Server Detected Cheats.")
				}
			}
		}
	})
})