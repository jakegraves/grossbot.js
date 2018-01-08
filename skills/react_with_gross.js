var debug = require('debug')('botkit:skills:gross');
module.exports = function (controller) {
    var _ = require('lodash');
    
    // To allow for easy manipulation of trigger words, we then get only the keys
    // and put it into an array
    var keywords = [];

    //TODO: Create different handlers for each team instead of handling all of them in these handlers here

    // Load keywords with team-scope triggers from storage
    controller.storage.teams.all((err, all_team_data) => {
        if (!err) {
            all_team_data.forEach((team_data) => {
                if (team_data.triggers) {
                    let team_triggers = team_data.triggers;
                    team_triggers.forEach((trigger) => {
                        // I'm directly mutating keywords cause Javascript is pass by a COPY of a reference
                        keywords.push(trigger);
                    });
                } else {
                    console.log('Could not find triggers for team with id: ' + team_data.id);
                }
            });
        } else {
            console.log(err);
        }

        // Log final state of keywords
        // console.log(keywords);
    });

    //Add a reaction to grossbot. 
    controller.hears('^add (.*)', 'direct_message,direct_mention', function (bot, message) {
        let trigger = message.match[1];

        if (trigger) {

            controller.storage.teams.get(message.team, function (err, team_data) {

                if (!err) {

                    let lowerTrigger = _.toLower(trigger);
                    let existingTrigger = _.find(team_data.triggers, (word) => {
                        return lowerTrigger === word;
                    });

                    if (existingTrigger) {
                        bot.reply(message, "I'm already calling \"" + trigger + "\" gross.");
                    } else {
                        bot.reply(message, "I'll start calling \"" + trigger + "\" gross.");
                        team_data.triggers = team_data.triggers || []; //Create a new triggers obj if it doesnt exist
                        team_data.triggers.push(lowerTrigger);

                        // Save new team_data in database
                        controller.storage.teams.save(team_data, function (err) {
                            console.log(err);
                        });

                        //Add trigger to trigger list now that reaction is in db
                        keywords.push(trigger);
                    }
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
            bot.reply(message, "Please type an actual word.");
        }
    });

    // Remove command
    controller.hears('^remove (.*)', 'direct_message,direct_mention', function (bot, message) {
        if (trigger = message.match[1]) {

            controller.storage.teams.get(message.team, function (err, team_data) {
                if (!err) {

                    let lowerTrigger = _.toLower(trigger);
                    let existingTrigger = _.find(team_data.triggers, (word) => {
                        return lowerTrigger === word;
                    });

                    if (!existingTrigger) {
                        bot.reply(message, "That word doesn't exist.");
                    } else {
                        var index = team_data.triggers.indexOf(trigger);
                        team_data.triggers.splice(index, 1);
                        index = keywords.indexOf(trigger);
                        keywords.splice(index, 1);
                        // Save changed team_data in database
                        controller.storage.teams.save(team_data, function (err) {
                            console.log(err);
                        });
                        bot.reply(message, "I removed the word " + trigger + ".");
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
    controller.hears('^list', 'direct_message,direct_mention', function (bot, message) {
        controller.storage.teams.all((err, all_team_data) => {
            if (!err) {
                let team = all_team_data.find(team => team.id === message.team);
                let level = 1;
                if (team.annoyance) {
                    level = team.annoyance.LevelSet;
                }
                if (team && team.triggers) {
                    let trigger_list = keywords.sort();
                    let response = trigger_list.reduce((accumulator, value) => {
                        return accumulator + value + ",";
                    }, "Trigger word list: \n ```");

                    response += "```\nMy annoyance level is set to " + level + ".";

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

    /**controller.hears('^explain (.*)', 'direct_message,direct_mention', function(bot, message){
        var sentence = message.match[1].toLowerCase();
        var offendingWords = _.filter(keywords, function(word){
            return sentence.indexOf(word) > -1;
        });
        let response;
        if(offendingWords.length === 0){
            response = "Looks clean to me.";        
        }else{
            response = offendingWords.reduce((accumulator, value) => {
                return accumulator + "\"" + value + "\", ";
            }, "I called that message out because ");
    
            if(offendingWords.length === 1){
                response = response.replace(",","") + "was typed out and that's gross."; 
            } else{
                response += "were typed out and it's super gross.";             
            }
        }

        bot.reply(message, response);
                
       });**/

    controller.hears('^what is your purpose?', 'direct_message,direct_mention', function (bot, message) {
        bot.reply(message, "To call you gross. I'm not programmed for friendship.");
    });

    controller.hears('^sleep', 'direct_mention', function (bot, message) {
        controller.storage.teams.get(message.team, function (err, team_data) {
            if (!err) {
                sleepCommand(team_data, message.channel);
                bot.reply(message, "Okay, I won't message in this channel for an hour.");
            } else {
                console.log(err);
            }
        });
    });

    controller.hears('^wake up', 'direct_mention', function (bot, message) {
        controller.storage.teams.get(message.team, function (err, team_data) {
            if (!err) {
                awakeCommand(team_data, message.channel);
                bot.reply(message, "I'm awake! This channel is under my protection. \n ..gross.");
            } else {
                console.log(err);
            }
        });
    });

    controller.hears("^don't be gross tammy", 'direct_message,direct_mention', function (bot, message) {
        controller.storage.teams.get(message.team, (err, team_data) => {
            if (!err) {
                sleepCommand(team_data, message.user);
                bot.reply(message, "In bird culture, that is what we call a \"dick move\". I'll leave you alone for an hour.");
            } else {
                console.log(err);
            }
        });
    });

    controller.hears("^don't be gross", 'direct_message,direct_mention', function (bot, message) {
        controller.storage.teams.get(message.team, (err, team_data) => {
            if (!err) {
                sleepCommand(team_data, message.user);
                bot.reply(message, "Okay, I won't respond to your messages for an hour.");
            } else {
                console.log(err);
            }
        });
    });

    controller.hears("^gross", 'direct_message,direct_mention', function (bot, message) {
        controller.storage.teams.get(message.team, (err, team_data) => {
            if (!err) {
                awakeCommand(team_data, message.user);
                bot.reply(message, "I know, right? I've got you covered... in gross.");
            } else {
                console.log(err);
            }
        });
    });

    controller.hears("^set annoyance level (.*)", 'direct_message,direct_mention', function (bot, message) {
        let level = Number(message.match[1]);
        if (isNaN(level) || level > 10 || level < 1) {
            bot.reply(message, "Please provide a number between 1 (most annoying) and 10 (least annoying).")
        } else {
            controller.storage.teams.get(message.team, (err, team_data) => {
                if (!err) {
                    team_data.annoyance = team_data.annoyance || {};
                    team_data.annoyance.LevelSet = level;
                    team_data.annoyance.Current = 0;
                    controller.storage.teams.save(team_data, function (err) {
                        console.log(err);
                        if (err) {
                            bot.reply(message, "Something went wrong. Please try again later.");
                        }
                        bot.reply(message, "Annoyance level set at " + level + ".");
                    });
                } else {
                    console.log(err);
                }
            });
        }
    });

    function sleepCommand(team_data, entityId) {
        team_data.sleep = team_data.sleep || {};
        let sleepUntil = new Date();
        sleepUntil.setHours(new Date().getHours() + 1);
        team_data.sleep[entityId] = sleepUntil.toISOString();
        controller.storage.teams.save(team_data, function (err) {
            console.log(err);
            if (err) {
                bot.reply(message, "Something went wrong. Please try again later.");
            }
        });
    }

    function awakeCommand(team_data, entityId) {
        team_data.sleep = team_data.sleep || {};
        delete team_data.sleep[entityId];
        controller.storage.teams.save(team_data, function (err) {
            console.log(err);
            if (err) {
                bot.reply(message, "Something went wrong. Please try again later.");
            }
        });
    }



    // Help command
    controller.hears('^help', 'direct_message,direct_mention', function (bot, message) {
        let version = process.env.VERSION || ""
        let help_message = `GrossBot ${version}                                             
COMMANDS:                                                                       
*add <trigger>*: Tell GrossBot to react to any text you give.
*remove <trigger>*: Tell GrossBot to stop listening to a <trigger> word
*list*: Show all the trigger phrases GrossBot is listening for
*don't be gross*: GrossBot won't listen to you ambiently for an hour
*gross*: GrossBot will listen to you ambiently
*sleep*: GrossBot won't comment on the channel for an hour
*wake up*: GrossBot starts commenting again
*set annoyance level <number>*: 1 being the most annoying, 10 the least.
*help*: Show this help message                            

Have a feature request, bug report, or general inquiry? Please contact us here:
https://hashidevgross.herokuapp.com/contact.html
`
        bot.reply(message, help_message);
    });

    // Listen for a keyword and post a reaction
    controller.hears(keywords, 'ambient,direct_message,direct_mention', function (bot, message) {
        bot.api.reactions.add({
            name: selectReaction(),
            timestamp: message.event_ts,
            channel: message.channel
        }, function(err, response){
            if(err){
                console.log(err);
            }
        });
        /** 
        controller.storage.teams.get(message.team, (err, team_data) => {
            if (!err) {
                let triggers = team_data.triggers;
                team_data.annoyance = team_data.annoyance || { LevelSet: 1, Current: 0 };
                let now = new Date();
                let canBeGross = true;

                if (team_data.sleep[message.channel]) {
                    let channelSleepTime = new Date(team_data.sleep[message.channel]);
                    canBeGross = now.getTime() > channelSleepTime.getTime();
                }

                if (team_data.sleep[message.user]) {
                    let userSleepTime = new Date(team_data.sleep[message.user]);
                    canBeGross = now.getTime() > userSleepTime.getTime();
                }

                var offendingWords = _.filter(triggers, function (word) {
                    return message.text.indexOf(word) > -1;
                });

                //When printed out, it's nice to have them in order.
                offendingWords = _.uniq(offendingWords.reverse());

                offendingWords.length ? team_data.annoyance.Current++ : team_data.annoyance.Current += 0;

                if (canBeGross && offendingWords.length > 0 && team_data.annoyance.LevelSet <= team_data.annoyance.Current) {
                    team_data.annoyance.Current = 0;
                    controller.storage.teams.save(team_data, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            let response = "'";
                            if (offendingWords.length === 1) {
                                response += _.upperFirst(offendingWords[0]) + "'? " + selectResponse();
                            } else if (offendingWords.length === 2) {
                                response += _.upperFirst(offendingWords[0]) + "' and '" + offendingWords[1] + "'? " + selectResponse();
                            } else {
                                let first = _.upperFirst(offendingWords.shift());
                                let last = offendingWords.pop();
                                response = offendingWords.reduce((accumulator, value) => {
                                    return accumulator + "'" + value + "', ";
                                }, "'" + first + "', ");
                                response += "and '" + last + "'? " + selectResponse();
                            }
                            bot.reply(message, response);
                        }
                    });
                } else {
                    controller.storage.teams.save(team_data, function (err) {
                        console.log(err);
                    });
                }

            } else {
                console.log(err);
            }
        });
        */
    });

    controller.on('reaction_added', function(bot, event){
        if(event.reaction === "eggplant"){
            bot.reply(event, {channel: event.item.channel, text: "Gross."});
        } else if (event.reaction === "cancer"){
            bot.reply(event, {channel: event.item.channel, text: "69? Gross."});
        }
    });

    var responses = [
        "Gross.",
        "Gross.",
        "Gross.",
        "That's what she said."
    ]

    var reactions = [
        "grimacing",
        "joy",
        "smirk", 
        "frowning",
        "zipper_mouth_face",
        "mask",
        "hankey",
        "ok_hand",
        "face_with_rolling_eyes",
        "lipstick",
        "mushroom", 
        "eggplant",
        "banana",
        "cancer",
        "radioactive_sign",
        "biohazard_sign"
    ]
    function selectResponse() {
        return responses[Math.floor(Math.random() * responses.length)];
    }
    function selectReaction() {
        return reactions[Math.floor(Math.random() * reactions.length)];
    }

};
