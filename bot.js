// ReactionBot

//Note: Heroku assigns a $PORT variable
var env = require('dotenv');
env.config();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.DATABASE_URL) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, DATABASE_URL and PORT in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var debug = require('debug')('botkit:main');
var mongoStorage = require('botkit-storage-mongo')({mongoUri: process.env.DATABASE_URL, tables: ['triggers']});

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.slackbot({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    debug: true,
    scopes: ['bot'],
    studio_token: process.env.STUDIO_TOKEN,
    //studio_command_uri: process.env.studio_command_uri,
    //json_file_store: __dirname + '/.db/' // store user data in a simple JSON format
    storage: mongoStorage
});

controller.startTicking();

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')(controller);

// Set up a simple storage backend for keeping a record of customers
// who sign up for the app via the oauth
require(__dirname + '/components/user_registration.js')(controller);

// Send an onboarding message when a new team joins
require(__dirname + '/components/onboarding.js')(controller);

// no longer necessary since slack now supports the always on event bots
// // Set up a system to manage connections to Slack's RTM api
// // This will eventually be removed when Slack fixes support for bot presence
// var rtm_manager = require(__dirname + '/components/rtm_manager.js')(controller);

// Reconnect all pre-registered bots
// rtm_manager.reconnect();

// Enable Dashbot.io plugin
require(__dirname + '/components/plugin_dashbot.js')(controller);

console.log('Importing skill modules...');
console.log('~~~~~~~~~~');
var normalizedPath = require("path").join(__dirname, "skills");
require("fs").readdirSync(normalizedPath).forEach(function(file) {
    if(file.endsWith('.js') && !file.startsWith('.#')){
        console.log('Importing ' + file);
        require("./skills/" + file)(controller);
    }
});



// Show we're running
controller.log.info("Running GrossBot...");

function database_config(uri){
    //let regex = /^postgres:\/\/(\S+):(\S+)@(\S+)\/(\S+)$/g;
    let regex = /^postgres:\/\/(\S+):(\S+)@(\S+):(\d+)\/(\S+)$/g;
    let match = regex.exec(uri);

    console.log("URI: " + uri)
    console.log(match);

    if(match && match[5]){
        let obj = {
            user: match[1],
            password: match[2],
            host: match[3],
            port: match[4],
            database: match[5]
        };
        return obj;
    }  
}
