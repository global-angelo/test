const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserChannelId } = require('../utils/channelManager');
const { recordUpdate } = require('../utils/dynamoDbManager');
const { sendToChannel } = require('../utils/channelManager');
const { getActiveSession } = require('../utils/dynamoDbManager');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Provide an update on your work')
    .addStringOption(option => 
      option
        .setName('message')
        .setDescription('Your update message')
        .setRequired(true)
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
      
      const user = interaction.user;
      const updateText = interaction.options.getString('message');
      const guild = interaction.guild;
      
      // Get the member object to check roles
      const member = await guild.members.fetch(user.id);
      
      // Check if user has either working or onBreak role
      if (!member.roles.cache.has(config.roles.working) && !member.roles.cache.has(config.roles.onBreak)) {
        await interaction.editReply({
          content: "❌ You're not currently signed in. Use `/signin` to start a work session.",
          ephemeral: true
        });
        return;
      }
      
      // Check if user has an active session
      const activeSession = await getActiveSession(user.id);
      if (!activeSession) {
        await interaction.editReply({
          content: "❌ You don't have an active work session. Use `/signin` to start working first.",
          ephemeral: true
        });
        return;
      }
      
      // Check if user is signed out
      if (activeSession.Status === 'SignedOut') {
        await interaction.editReply({
          content: "❌ You're currently signed out. Use `/signin` to start a new work session.",
          ephemeral: true
        });
        return;
      }
      
      // Record the update in DynamoDB
      await recordUpdate(user.id, updateText);
      
      // Get the user's personal channel
      const channelId = await getUserChannelId(user.id, interaction.guild.id);
      const userChannel = channelId ? interaction.guild.channels.cache.get(channelId) : null;
      
      // Get current time and date
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Create update embed
      const updateEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📝 Status Update')
        .setDescription(`# ${user} is working on:`)
        .addFields(
          { 
            name: '📋 Update',
            value: `\`\`\`\n${updateText}\`\`\``,
            inline: false
          },
          { 
            name: '⏰ Time', 
            value: `**${timeString}**`, 
            inline: true 
          },
          { 
            name: '📅 Date', 
            value: `**${dateString}**`, 
            inline: true 
          }
        )
        .setAuthor({ 
          name: interaction.member.nickname || user.tag,
          iconURL: user.displayAvatarURL() 
        })
        .setFooter({ 
          text: 'Ferret9 Bot', 
          iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      // Send to user's personal channel if it exists
      if (userChannel) {
        await userChannel.send({ embeds: [updateEmbed] });
      }
      
      // Send to team channel - using the updates channel from config
      try {
        const updatesChannel = interaction.guild.channels.cache.find(
          channel => channel.name === 'updates'
        );
        
        if (updatesChannel) {
          await updatesChannel.send({ embeds: [updateEmbed] });
        } else {
          console.log('Updates channel not found');
        }
      } catch (error) {
        console.error('Error sending to updates channel:', error);
      }
      
      // Send confirmation to user
      await interaction.editReply({
        content: `✅ Your update has been posted successfully.`,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error executing update command:', error);
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