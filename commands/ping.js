const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Unsa man!??!?!'),
  
  async execute(interaction) {
    try {
// Check if interaction was already replied to or deferred
      if (interaction.replied || interaction.deferred) {
        console.log('Interaction already handled. Skipping.');
        return;
      }
      
      await interaction.deferReply();
      await interaction.editReply('Unsa man!??!?!');
    } catch (error) {
      console.error('Error executing ping command:', error);
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
 