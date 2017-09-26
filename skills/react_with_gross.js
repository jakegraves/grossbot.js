//TODO: Use debug() statements

module.exports = function(controller) {

    // To allow for easy manipulation of trigger words, we then get only the keys
    // and put it into an array
    var keywords = ["abort",  "absorb", "abuse",  "going down", "aching", "achy", 
    "moist", "coming", "come", "ahead", "flaccid", "coitus", "juice",
    "flat",     "patties",    "dollop",    "pudding",    "nog",    "putty",    "veiny",
    "secretion",    "secrete",    "curd",    "sack",    "raunchy",    "squat", 
    "thrust",    "low-hanging",    "low hanging",    "fruit",    "swab",    "fudge",
    "fudging", "eat it", "eat me",    "acquaint",    "teeming",    "clench",
    "smear",    "elbow grease",    "elbow-grease",    "grease",    "acquainting",
    "penetrate",    "penetration",    "grab",    "hunker",    "smear",    "privy",
    "staunch",    "loaf",    "tinkle",    "squelch",    "quench",    "tinker",
    "ointment",    "salve",    "panties",    "panty",    "groin",    "cranny",
    "nook",    "crotch",    "wimple",    "mulch",    "munch",    "follicle",
    "fanny",    "follicle",    "plow",    "chisel",    "slam dunk",    "jingle",
    "custard",    "man-cust",    "mancust",    "man-pats",    "manpats",
    "eatery",    "sippie cup",    "clam",    "muzzle",    "fresh",
    "pickle",    "funnel",    "fuddrucker",    "dig in",    "packet",
    "sloppy",    "slop bucket",    "soothing",    "milk",    "butter",
    "teat",    "turgid",    "cozy",    "cougar",    "nuzzle",    "hot meal",
    "patty",    "scrot",    "jock itch",    "bladder",    "wipe",    "scabies",
    "phlegm",    "borscht",    "plug",    "hard",    "soft",    "private",
    "public",    "grab",    "on it",    "merge",    "commit",    "pull request",
    "pull-request",    "put it in",     "tldr",    "leave early",    "late",
    "put in",    "semen",    "squirt"];

    var responses = [
        "Gross.",
        "Sick.",
        "Gross!",
        "Heh.",
        "That's what she said? Gross.",
        "Eww.",
        "Ugh."
    ]

    //TODO: Create different handlers for each team instead of handling all of them in these handlers here

    // Load keywords with team-scope triggers from storage
    controller.storage.teams.all((err, all_team_data) => {
        if(!err){
            all_team_data.forEach((team_data) => {
                if(team_data.triggers){
                    let team_triggers = team_data.triggers;
                    team_triggers.forEach((trigger) => {
                        // I'm directly mutating keywords cause Javascript is pass by a COPY of a reference
                        keywords.push(trigger); 
                    });
                } else {
                    console.log('Could not find triggers for team with id: ' + team_data.id);
                }
            });
        } else{
            console.log(err);
        }

        // Log final state of keywords
        // console.log(keywords);
    });

    //Add a reaction to reactionbot 
    controller.hears('^add (.*)', 'direct_message,direct_mention', function(bot, message) {
        let trigger = message.match[1];

        //TODO: Right now I'm making the assumption that reaction is an image.

        if (trigger && responses.indexOf(trigger)===-1){
            bot.reply(message, "You're right, \"" + trigger + "\" is pretty gross."); 

            controller.storage.teams.get(message.team, function(err, team_data){
                //console.debug(err)
                //console.debug(team_data)
                if(!err){
                    team_data.triggers = team_data.triggers || []; //Create a new triggers obj if it doesnt exist
                    team_data.triggers.push(trigger);
                   
                    // Save new team_data in database
                    controller.storage.teams.save(team_data, function(err){
                        console.log(err);
                    });

                    //Add trigger to trigger list now that reaction is in db
                    keywords.push(trigger);

                } else if (err.displayName === 'NotFound') { // If team does not exist in db, create a new team entry!
                    // Save new team_data in database
                    controller.storage.teams.save({
                        id: message.team,
                        triggers: [trigger]
                    }, (err) => {
                        console.log(err);
                    });

                    //Add trigger to trigger list now that reaction is in db
                    keywords.push(trigger);
                } else {
                    console.log(err);
                }
            });
        } else {
            bot.reply(message, "Stop trying to create an infinite loop!");
        }
    });
    
    // Remove command
    controller.hears('^remove (.*)', 'direct_message,direct_mention', function(bot, message) {
        if (trigger = message.match[1]){
            
            // Remove from db (actually just another add that overwrites)
            controller.storage.teams.get(message.team, function(err, team_data){
                if(!err){
                    if (team_data.triggers){
                        var index = team_data.triggers.indexOf(trigger);
                        team_data.triggers.splice(index, 1);
                        // Save changed team_data in database
                        controller.storage.teams.save(team_data, function(err){
                            console.log(err);
                        });
                        bot.reply(message, "I removed the word " + trigger + ".");
                    } else {
                        bot.reply(message, "That word doesn't exist.");
                    }
                } else {
                    console.log(err); 
                }
            });

            // Remove from keyword List (Just removes one instance from the keyword list)
            let index = keywords.indexOf(trigger);
            keywords.splice(index, 1);

        } else {
            bot.reply(message, "I don't think you gave me a WORD to remove. Please try again.");
        }
    });

    // List command
    controller.hears('^list', 'direct_message,direct_mention', function(bot, message){
        controller.storage.teams.all((err, all_team_data) => {
            if(!err){
                console.log(message.team + ' is asking for a keyword list!');
                console.log(all_team_data);

                let team = all_team_data.find(team => team.id === message.team);
                console.log("Team Name: " + team);
                if(team && team.triggers){
                    let trigger_list = keywords.sort();
                    let response = trigger_list.reduce((accumulator, value) => {
                        return accumulator + value + "\n";
                    }, "Trigger word list: \n ```");
                    response += "``` To use any of the above, see help command"; 

                    bot.reply(message, response);
                } else {
                    bot.reply(message, "I couldn't find any triggers words registered for team. :/");
                }
            } else {
                bot.reply(message, "Sorry, I couldn't get the list of keywords");
                console.log(err);
            }
        });
    });

    controller.hears('^explain (.*)', 'direct_message, direct_mention', function(bot, message){
        var _ = require('lodash');
        var sentence = message.match[1].toLowerCase();
        var offendingWords = _.filter(keywords, function(word){
            return sentence.indexOf(word) > -1;
        });
        let response;
        if(offendingWords.length === 0){
            response = "Looks clean to me.";        
        }else{
            response = offendingWords.reduce((accumulator, value) => {
                return accumulator + value + "\", ";
            }, "I called that message out because \"");
    
            if(offendingWords.length === 1){
                response = response.replace(",","") + " was typed out and that's gross."; 
            } else{
                response += " were typed out and it's super gross.";             
            }
        }

        bot.reply(message, response);
                
    });

    // Help command
    controller.hears('^help', 'direct_message, direct_mention', function(bot, message){
        let version = process.env.VERSION || ""                                             
        let help_message = `GrossBot ${version}                                             
COMMANDS:                                                                       
*add <trigger>*\t\t\t\t\t\t  => Tell GrossBot to react to any text you give.
*remove <trigger>*\t\t\t\t => Tell GrossBot to stop listening to a <trigger> word  
*list*\t\t\t\t\t\t\t\t\t\t  => Show all the trigger phrases GrossBot is listening for
*help*\t\t\t\t\t\t\t\t\t   => Show this help message                            

Have a feature request, bug report, or general inquiry? Please contact us here:
https://hashidevgross.herokuapp.com/contact.html
` 
        bot.reply(message, help_message);
    });

    // Listen for a keyword and post a reaction
    controller.hears(keywords, 'ambient,direct_message,direct_mention', function(bot, message) {
        //console.debug(bot);
        //console.debug(message);
        //controller.storage.teams.get(message.team, (err, team_data) => {
        //    if(!err){
                bot.reply(message, {
                    'username': 'GrossBot',
                    'text': selectResponse(),
                });
        //    } else {
        //        console.log(err);
        //    }
        //});
    });

    function selectResponse(){
        return responses[Math.floor(Math.random() * responses.length)];
    }

    
};
