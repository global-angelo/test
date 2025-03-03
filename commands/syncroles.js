const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { synchronizeAllUserRoles, synchronizeUserRoles } = require('../utils/roleManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('syncroles')
    .setDescription('Synchronize user roles with their database status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('Specific user to synchronize (leave empty to sync all users)')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    try {
// Check if interaction was already replied to or deferred
      if (interaction.replied || interaction.deferred) {
        console.log('Interaction already handled. Skipping.');
        return;
      }
      
      
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const guild = interaction.guild;
      const targetUser = interaction.options.getUser('user');
      
      if (targetUser) {
        // Sync a specific user
        const success = await synchronizeUserRoles(guild, targetUser.id);
        
        if (success) {
          await interaction.editReply({
            content: `✅ Successfully synchronized roles for user ${targetUser}.`,
            ephemeral: true
          });
        } else {
          await interaction.editReply({
            content: `❌ Failed to synchronize roles for user ${targetUser}. Check the logs for details.`,
            ephemeral: true
          });
        }
      } else {
        // Sync all users
        await interaction.editReply({
          content: `⏳ Synchronizing roles for all users. This may take a moment...`,
          ephemeral: true
        });
        
        const syncCount = await synchronizeAllUserRoles(guild);
        
        await interaction.editReply({
          content: `✅ Successfully synchronized roles for ${syncCount} users.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error in syncroles command:', error);
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