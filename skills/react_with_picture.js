//TODO: Use debug() statements

module.exports = function(controller) {

    // TODO: Load keywords from database (for now team-wide reactions only)
    var trigger_words = ['^add (.*)'];

    // Add command (Should it be a slash command?)
    controller.hears(trigger_words, 'direct_message,direct_mention', function(bot, message) {
        bot.reply(message, 'I heard your add request!');
        if (new_command = message.match[1]){
            bot.reply(message, 'I will add ' + new_command + ' to your trigger list.'); 
            trigger_words.push(new_command);
        }
    });

    //TODO: Remove command

    //TODO: Actual react with image or something
};
