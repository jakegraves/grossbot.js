//TODO: Use debug() statements

module.exports = function(controller) {

    // Each list of triggers for a certain entity (either a user, channel,
    // or team) is stored in the database as so:
    // {
    //     "id": "ENTITY_ID",
    //     "triggers": {
    //         'foo': 'bar.com/pic1.jpg',
    //         'memes': 'dreams.jpg',
    //         ':reaction:': 'bigger-reaction.jpg'
    //     }
    // }

    // However, our in-memory store is just one big array of trigger keys   
    // TODO: A better way of storing this cause this scales incredibly poorly
    // TODO: Permissions
    let keywords = [];


    // Load keywords with team-scope triggers from storage
    controller.storage.teams.all((err, all_team_data) => {
        if(!err){
            //console.log(all_team_data);
            all_team_data.forEach((team_data) => {
                if(team_data.hasOwnProperty('triggers')){
                    keywords.concat(team_data.triggers.keys());
                } else {
                    console.log('Could not find triggers for team with id: ' + team_data.id);
                }
            });
        } else{
            console.log(err);
        }
    });

    //Add a reaction to reactionbot 
    // TODO: TEST ME 
    //TODO: Let you add for you, your channel, or your team only
    controller.hears('^add (.*) (.*)', 'direct_message,direct_mention', function(bot, message) {
        let trigger = message.match[1];
        let reaction = message.match[2];

        reaction = extract_url(reaction); 

        //TODO: Right now I'm making the assumption that reaction is an image.

        if (trigger && reaction){
            bot.reply(message, "Sure, I'll react to  \"" + trigger + "\" with \"" + reaction + "\" now :grinning:"); 

            //TODO: I should be using promises tbh
            controller.storage.teams.get(message.team, function(err, team_data){
                if(!err){
                    team_data.triggers = team_data.triggers || {}; //Create a new triggers obj if it doesnt exist
                    team_data.triggers[trigger] = reaction;
                   
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
                        triggers: {
                            [trigger]: reaction
                        }
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
            bot.reply(message, "I didn't understand you sorry :disappointed:. I need a WORD to react to and a REACTION to react with");
        }
    });
    // TODO: TEST ME 
    // Remove command
    controller.hears('^remove (.*)', 'direct_message,direct_mention', function(bot, message) {
        if (trigger = message.match[1]){
            
            // Remove from db (actually just another add that overwrites)
            controller.storage.teams.get(message.team, function(err, team_data){
                if(!err){
                    if (team_data.triggers && delete team_data.triggers[trigger]){
                        // Save changed team_data in database
                        controller.storage.teams.save(team_data, function(err){
                            console.log(err);
                        });
                        bot.reply(message, "I removed the reaction for " + trigger + "!");
                    } else {
                        bot.reply(message, "I don't think that reaction exists!");
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
    // TODO: TEST ME 
    //Get command
    controller.hears('^get (.*)', 'direct_message,direct_mention', function(bot, message){
        if (trigger = message.match[1]){
            controller.storage.teams.get(message.team, (err, team_data) => {
                if(!err && team_data.triggers && team_data.triggers[trigger]){
                    bot.reply(message, {
                        'username': 'ReactionBot',
                        'text': '',
                        'attachments': [
                            {
                                'text': '',
                                'image_url': team_data.triggers[trigger]
                            }
                        ]
                    });
                } else {
                    bot.reply("I don't think that reaction exists!");
                    console.log(err);
                }
            });
        } else{
            bot.reply(message, "I don't think you gave me a reaction to try to get!");
        }
    });

    // TODO: TEST ME 
    // Listen for a keyword and post a reaction image if you hear it
    controller.hears(keywords, 'message_received', function(bot, message) {
        controller.storage.teams.get(message.team, (err, team_data) => {
            if(!err){
                bot.reply(message, {
                    'username': 'ReactionBot',
                    'text': '',
                    'attachments': [
                        {
                            'text': '',
                            'image_url': team_data.triggers[message.match[0]]
                        }
                    ]
                });
            } else {
                console.log('Detected word, but could not get reaction from database.');
                console.log(err);
            }
        });
    });

    // Test a word
    controller.hears('^test (.*)', 'direct_message,direct_mention', function(bot, message){
        if(word = message.match[1]){
            console.log("The message is: ");
            console.log(word);
            bot.reply(message, {
                'text': '',
                'attachments': [
                    {
                        'text': '',
                        'image_url': extract_url(word)
                    }
                ]
            });
        }
    });
 
    controller.hears('^testdb (.*)', 'direct_message,direct_mention', function(bot, message){
        if(word = message.match[1]){
            controller.storage.teams.get(word, (err, team_data) => {
                if(!err){
                    console.log('team data: ');
                    console.log(team_data);
                } else{
                    console.log('error: ');
                    console.log(err);
                }
            });
        }
    });


    /***************************************************************************/
    //TODO: Removing HTML characters?
    function extract_url(text){
        let match = /<([^>\|]+)(?:\|([^>]+))?>/g.exec(text);
        if(url = match[1]){
            return decodeURIComponent(url) // Remove percent encoding 
        }
    }
};
