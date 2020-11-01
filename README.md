# TenableGameServer
NodeJS Server for the Tenable Game

## Server Setup
Cool setup time
This should work with anything that supports NodeJS, but has been verified to work on Windows 10

### Step 0
Setting up

Install NodeJS
Windows: https://nodejs.org/en/download/

Linux:
`sudo apt install nodejs npm`

### Step 1
Download TenableGameServer

Navigate to the [Releases Page](https://github.com/200Tigersbloxed/TenableGameServer/releases)

Windows:
Download the Windows.zip from the latest release. Extract the ZIP into any directory.

Linux:
Download the Linux.zip from the latest release. Extract the ZIP into any directory.

### Step 2
Installing Tenable Game Dependencies

Windows: Run any batch file named Dependency[number].bat

Linux: Run these command(s) in the same directory as the .js file.
`npm install fs`
`npm install socket.io`
`npm install timers`

### Step 3
Start the server

Windows: Run start.bat

Linux: While in the same directory as the .js file, run this command
`node [name of .js file].js`

## Config
Configuration for the server

`serverPort`: (int) The port the server runs on. Default: `3000`

`serverName`: (string) The name of the server.

`whitelist`: (bool) Enable's a server whitelist. Default: `false`

`minplayers`: (int) The minimum amount of players required to start a round. Default: `3` Required: `>=2`

`maxplayers`: (int) The maximum amount of players allowed in the server. Default: `45` Required: `>=2`

`kickPlayersOnDetectedCheat`: (bool) Will kick players from the server who are sending custom socket events. Default: `true`

`hideGlobalModerationReasons`: (bool) Will hide moderation action reasons from others in the server. Default: `false`

`users`: (JSONObject) Defines whitelisted users.

`admins`: (JSONObject) Defines admins of the server.
