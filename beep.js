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
var latestServerMessage = "If you see this message, then there's probably something wrong"
var inRound = false
var startingRound = false
var startingEndRound = false
var host
var hostSocket
var hostQuestion = undefined
var hostChecking = false
var currentPlayer = undefined
var playerIsAnswering = false
var playerAnswer
var playerswhovehadturn = []
var answersCorrect = 0
var numbersRight = {
	"1": false,
	"2": false,
	"3": false,
	"4": false,
	"5": false,
	"6": false,
	"7": false,
	"8": false,
	"9": false,
	"10": false
}
var theplayerlisttopickfrom = []

// socket stuff
var playerswithsocket = []

var io = require('socket.io')({
	transports: ['websocket'],
	pingInterval: 4000,
	pingTimeout: 2000,
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
	if(latestServerMessage != message){
		latestServerMessage = message;
		setTimeout(function(){
			io.emit("serverMessage", { "message": latestServerMessage })
		}, 500)
	}
}

function sendMessageBoxMessage(message){
	setTimeout(function(){
		io.emit('messageboxmessage', {"message": message})
	}, 500)
}

function kickPlayer(targetSocket, reason){
	targetSocket.emit('kick', { "reason": reason })
	setTimeout(function(){
		targetSocket.disconnect();
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
	// This SHOULD be used for picking the host

	// this section should no longer have to be used
	/*
	for(var i = 0; i < theplayerlisttopickfrom.length; i++){
		if(theplayerlisttopickfrom[i] == host){
			delete theplayerlisttopickfrom[i]
		}
	}

	// check if the array is empty
	if(filtered.length <= 0){
		return false
	}
	*/
	
	// filter theplayerlisttopickfrom[] for empty things
	var filtered = theplayerlisttopickfrom.filter(function (el) {
		return el != null
	})
	// pick a person
	var randomElement = filtered[Math.floor(Math.random() * filtered.length)]
	// now indicate they've had a turn
	for(var k in filtered){
		if(filtered[k] == randomElement){
			delete filtered[k]
		}
	}
	theplayerlisttopickfrom = filtered
	// then return the player that was picked
	if(randomElement == getPlayerNameFromSocket(hostSocket)){
		return false
	}
	return randomElement
}

function EndPlayerTurn(playername){
	//var playersocket = getSocketFromPlayerName(playername)
	//currentPlayer = undefined
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
	sendServerMessage("Waiting for players...")
}, 5000)

// game loop check
var gameLoopInterval = setInterval(function(){
	// loops every 10 ms
	if(!inRound){
		if(players.length >= minplayers){
			// there's enough players to start the round
			// check to see if we've already started the round
			if(!startingRound){
				if(!startingEndRound){
					BeginStartRound()
				}
			}
		}
	}
	else{
		// a round is happening, check variables
		// check to make sure players are always above or equal to minimum
		if(players.length < minplayers){
			// not enough players, end it
			EndRound()
		}
		if(hostQuestion == undefined){
			// no host question yet, wait please
		}
		else{
			if(!playerIsAnswering){
				// we need a new player
				playerIsAnswering = true
				playerAnswer = undefined
				var selectedPlayer = PickNewPlayer()
				if(selectedPlayer == undefined){
					EndRound()
				}
				else if(selectedPlayer == false){
					// try again
					selectedPlayer = PickNewPlayer()
				}
				else{
					currentPlayer = selectedPlayer
					sendMessageBoxMessage(selectedPlayer + " is up to play!")
					var cpSocket = getSocketFromPlayerName(selectedPlayer)
					cpSocket.emit('answerQuestion', {"question": hostQuestion})
					playerIsAnswering = true
				}
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
		startingEndRound = false
		// set the player list to pick from to all the players to initiate PickNewPlayer()
		theplayerlisttopickfrom = players
		// pick a host
		// old method: players[Math.floor(Math.random() * players.length)]
		host = PickNewPlayer()
		hostSocket = getSocketFromPlayerName(host)
		io.emit("startround", {"host": host})
		inRound = true
		sendMessageBoxMessage(host + " is our host!")
		// yes this should be the same as the else down there
		startingRound = false
		playerIsAnswering = true
	}
	else{
		// Can't start round, someone left
		startingRound = false;
	}
}

function EndRound(){
	inRound = false
	startingRound = false
	startingEndRound = true
	host = undefined
	hostSocket = undefined
	hostQuestion = undefined
	hostChecking = false
	currentPlayer = undefined
	playerIsAnswering = false
	playerAnswer = undefined
	answersCorrect = 0
	numbersRight = {
		"1": false,
		"2": false,
		"3": false,
		"4": false,
		"5": false,
		"6": false,
		"7": false,
		"8": false,
		"9": false,
		"10": false
	}
	io.emit("endround")
	theplayerlisttopickfrom.length = 0
	theplayerlisttopickfrom = players
	console.log(theplayerlisttopickfrom)
	sendServerMessage("Timeout for 30 Seconds")
	setTimeout(function(){
		BeginStartRound()
	}, 30000)
}

io.on('connection', (socket) => {
	console.log("Client attempting to connect...")
	socket.on('disconnect', () => {
		// Lets see whos still here
		previousplayers = players
		io.emit('getplayers')
		var failedToFindPlayer = false
		// find out who left
		try{
			var plrwholeft = getPlayerNameFromSocket(socket)
		}
		catch{
			failedToFindPlayer = true
		}
		if(plrwholeft == undefined){ failedToFindPlayer = true }
		// make sure there was a player before continuing
		if(!failedToFindPlayer){
			if(inRound && currentPlayer != undefined){
				if(currentPlayer.toLowerCase() == plrwholeft.toLowerCase()){
					// okay se we can just pick a new person
					playerIsAnswering = false
					// thats it
				}
			}
			if(inRound && host != undefined){
				if(host.toLowerCase() == plrwholeft.toLowerCase()){
					// yep so lets fix stuff
					EndPlayerTurn()
					delete playerswhovehadturn[plrwholeft]
					// thats it
				}
			}
			// remove them from the list
			for(var k in theplayerlisttopickfrom){
				if(theplayerlisttopickfrom[k] == plrwholeft){
					delete theplayerlisttopickfrom[k]
				}
			}
			// then filter it as to not break anything
			var filteredTPLTPF = theplayerlisttopickfrom.filter(function (el) {
				return el != null
			})
			theplayerlisttopickfrom = filteredTPLTPF
			var filteredPWHT = playerswhovehadturn.filter(function (el) {
				return el != null
			})
			playerswhovehadturn = filteredPWHT
			// continue
			console.log(plrwholeft + " Left the Server")
			socket.broadcast.emit("playerleft", {"target": plrwholeft})
			// now remove the player that just left from the players table and playerswithsocket array
			const index = players.indexOf(plrwholeft)
			players.splice(index, 1)
			delete playerswithsocket[plrwholeft]
		}
		// everything else happens in return players
		socket.disconnect();
	})

	socket.on('connectiontest', () => {
		socket.emit('connectiontest', {"result": true})
	})
	
	socket.on('login', (ev) => {
		var logindata = JSON.parse(ev)
		setTimeout(function(){
			if(players.length < maxplayers){
				if(!inRound){
					if(!CheckForDuplicatePlayer(logindata.username)){
						if (!config.whitelist) {
							console.log(logindata.username + " has joined the server!")
							players.push(logindata.username)
							playerswithsocket[logindata.username] = {
								"username": logindata.username,
								"socket": socket
							}
							socket.broadcast.emit("playerjoined", {"player": logindata.username})
							sendServerMessage(logindata.username + " has joined the server!")
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
								sendServerMessage(logindata.username + " has joined the server!")
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
	socket.on('warn', (ev) => {
		var warndata = JSON.parse(ev)
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
			try{
				targetsocket.emit('warn', { "reason": reason })
				console.log(getSocketFromPlayerName(socket) + " warned " + target + " for " + reason + ".")
			}
			catch{}
		}
		else{
			try{
				socket.emit('failtowarn', { "reason": "Failed to Send Warning: You're not an Admin!" })
			}
			catch{}
		}
	})

	socket.on('kick', (ev) => {
		var warndata = JSON.parse(ev)
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
			try{
				kickPlayer(targetsocket, reason)
			}
			catch{}
		}
		else{
			try{
				socket.emit('failtokick', { "reason": "Failed to Kick User: You're not an Admin!" })
			}
			catch{}
		}
	})
	
	// chat controller
	socket.on('sendchatmessage', (ev) => {
		var messagedata = JSON.parse(ev)
		// when a client sends a message
		var sender = messagedata.username
		var message = messagedata.msg

		console.log(sender + "> " + message);
		io.emit('getchatmessage', { "sender": sender, "msg": message })
	})

	// answer controller
	socket.on('answerSubmitted', (ev) => {
		var messagedata = JSON.parse(ev)
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
				if(hostQuestion == undefined){
					// okay there's no question
					hostQuestion = answer
					io.emit('hostQuestion', {"question": hostQuestion})
					playerIsAnswering = false
				}
				else{
					// it's not a question its a response answer
					if(answer == "wrong"){
						// the answer is wrong LMAOOOO YOU SUCK AT TENABLE
						io.emit('answerSubmitted', {"isRight": "no", "answer": answer})
						setTimeout(function() {
							EndPlayerTurn()
						}, 10000);
					}
					else{
						// the answer is right, good job
						// BUT WAIT, HAS THE NUMBER BEEN SUBMITTED????
						// (are they using fake sockets)
						for(var i = 0; i < numbersRight.length; i++){
							if(i[answer] == true){
								// stupid cheater
								if(kickPlayersOnDetectedCheat){
									kickPlayer(socket, "Server Detected Cheats.")
								}
							}
						}
						// if u make it past this point then they're not a cheater
						// lets set the number value to true
						numbersRight[answer] = true
						io.emit('answerSubmitted', {"isRight": "yes", "answer": answer})
						answersCorrect++
						setTimeout(function(){
							if(answersCorrect >= 10){
								EndRound()
							}
							else{
								var cpSocket = getSocketFromPlayerName(currentPlayer)
								cpSocket.emit('answerQuestion', {"question": hostQuestion})
							}
						}, 10000)
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
					io.emit("responseString", {"response": playerAnswer})
					io.emit("checkAnswer", {"answer": playerAnswer})
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