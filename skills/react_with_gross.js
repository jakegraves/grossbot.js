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

    function joinMatches(array) {
        if(array.length === 0){
            return;
        }
        if(array.length === 1){
            return `${array[0]}? ${selectReaction()}`;
        } else if(array.length === 2){
            return `${array[0]} and ${array[1]}? ${selectReaction()}`;
        } else{
            var end = array.pop();
            var main = array.join(", ");
            return `${main} and ${end}? ${selectReaction()}`;
        }
    }



    // Help command
    controller.hears('^help', 'direct_message,direct_mention', function (bot, message) {
        let version = process.env.VERSION || ""
        let help_message = `GrossBot ${version}                                             
COMMANDS:                                                                       
*add <trigger>*: Tell GrossBot to react to any text you give.
*remove <trigger>*: Tell GrossBot to stop listening to a <trigger> word
*list*: Show all the trigger phrases GrossBot is listening for
*help*: Show this help message                            

I react with "Gross" to the following reactions: 
:lipstick:, :mushroom:, :eggplant:, :banana:, :cancer:, :peach:, :sweat_drops:, :fist:, and :wave:
Have a feature request, bug report, or general inquiry? Please contact us here:
https://hashidevgross.herokuapp.com/contact.html
`
        bot.reply(message, help_message);
    });

    // Listen for a keyword and post a reaction
    controller.hears(keywords, 'ambient,direct_message,direct_mention', function (bot, message) {
        bot.replyInThread(message, joinMatches(message.match[i]));
    });

    controller.on('reaction_added', function (bot, event) {
        console.log(event);
        if (["lipstick", "mushroom", "eggplant", "banana", "cancer", "peach", "sweat_drops", "fist", "wave"].some(function (element) {
                return event.reaction === element;
            })) {
            bot.api.users.info({
                    user: event.user
                },
                function (err, response) {
                    if (err) {
                        console.log(err);
                    } else {
                        var currentUser = _.upperFirst(response["user"]["name"]);

                        bot.replyInThread(event.item, `:${event.reaction}: ${currentUser} thinks that's gross. :${event.reaction}:`);
                    }
                });
        }
    });

    var reactions = [
        "lol",
        "Gross.",
        "Phrasing.",
        "That's what she said.",
        ":joy:",
        ":smirk:",
        ":eggplant:",
        ":banana:"
    ]

    function selectReaction() {
        return reactions[Math.floor(Math.random() * reactions.length)];
    }

};
