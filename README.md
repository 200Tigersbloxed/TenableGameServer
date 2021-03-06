# TenableGameServer
NodeJS Server for the Tenable Game

## Server Setup
Cool setup time
This should work with anything that supports NodeJS, but has been verified to work on Ubuntu 18.04
IMPORTANT: When installing socket.io, be sure you install socket.io@2.0.2 (v2.0.2), otherwise the client may not be able to connect to the server.

### Step 0
Setting up

Install NodeJS
Windows: https://nodejs.org/en/download/

Linux:
`sudo apt install nodejs npm`

### Step 1
Download TenableGameServer

Navigate to the [Releases Page](https://github.com/200Tigersbloxed/TenableGameServer/releases)

Download the latest release

### Step 2
Installing Tenable Game Dependencies

Run these command(s) in the same directory as the .js file.
`npm install fs`
`npm install socket.io@2.0.2`
`npm install timers`

### Step 3
Start the server

While in the same directory as the .js file, run this command
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

## Common Problems

SyntaxError: Unexpected token {

You are on an older version of Node, upgrade to Node 10+

Linux: https://joshtronic.com/2018/05/08/how-to-install-nodejs-10-on-ubuntu-1804-lts/


Cannot find module 'x'

You are missing a module.

Run `npm i [name of module]` to fix this issue
