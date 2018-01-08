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
    scopes: ['bot', 'reactions:read', 'reactions:write', 'files:read', 'emoji:read'],
    studio_token: process.env.STUDIO_TOKEN,
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
