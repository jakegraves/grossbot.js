const http = require('http');

module.exports = function(controller) {

    let wait_time = 300000; // 5 Minutes * 60 seconds * 1000 milliseconds

    /* Ping app a random amount of minutes (between 1 and 10) to prevent Heroku idling */
    let prevent_idle = function(){
        http.get("http://reactionbot-js.herokuapp.com/");
        wait_time = (Math.floor(Math.random() * 10) + 1) * 60000;
        timeout = setTimeout(prevent_idle, wait_time); 
    }

    // Start idle
    setTimeout(prevent_idle, wait_time);
};
