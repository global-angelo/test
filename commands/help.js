const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveSession } = require('../utils/dynamoDbManager');
const { getAvailableCommands, formatCommandList } = require('../utils/commandHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and how to use them'),
  
  async execute(interaction) {
    try {
// Check if interaction was already replied to or deferred
      if (interaction.replied || interaction.deferred) {
        console.log('Interaction already handled. Skipping.');
        return;
      }
      
      
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const user = interaction.user;
      
      // Check user's current status
      const activeSession = await getActiveSession(user.id);
      let status = 'Unknown';
      
      if (!activeSession) {
        status = 'Inactive';
      } else if (activeSession.Status === 'Break') {
        status = 'Break';
      } else if (activeSession.Status === 'Active') {
        status = 'Active';
      }
      
      // Get commands based on user's status
      const commandInfo = getAvailableCommands(status);
      const commandList = formatCommandList(commandInfo.commands);
      
      // Create help embed
      const helpEmbed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle(commandInfo.title)
        .setDescription(commandInfo.description)
        .addFields(
          { 
            name: '📋 Available Commands', 
            value: commandList
          },
          {
            name: '📚 General Information',
            value: `• Use \`/start\` to create your personal log channel\n• Use \`/signin\` to begin tracking your work time\n• Use \`/update\` to share what you're working on\n• Use \`/break\` when you need to step away\n• Use \`/back\` when you return from a break\n• Use \`/signout\` when you're done for the day`
          }
        )
        .setFooter({ 
          text: 'Ferret9 Bot', 
          iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      // Send the help embed
      await interaction.editReply({
        embeds: [helpEmbed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error in help command:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred. Please try again.",
            ephemeral: true
          }).catch(err => console.error('Error replying to interaction:', err));
        } else if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content: "❌ An error occurred. Please try again."
          }).catch(err => console.error('Error editing reply:', err));
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  },
}; 