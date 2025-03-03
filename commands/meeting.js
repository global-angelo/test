const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logUserActivity } = require('../utils/activityLogger');

// Add console log to verify this file is being loaded
console.log('Loading meeting command...');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meeting')
    .setDescription('Notify team members to join your voice channel for a meeting')
    .addStringOption(option => 
      option
        .setName('topic')
        .setDescription('The topic of the meeting')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('duration')
        .setDescription('Expected duration of the meeting (e.g., "30 minutes", "1 hour")')
        .setRequired(false)),
  
  async execute(interaction) {
    try {
// Check if interaction was already replied to or deferred
      if (interaction.replied || interaction.deferred) {
        console.log('Interaction already handled. Skipping.');
        return;
      }
      
      
      console.log('Executing meeting command...');
      
      // Defer the reply immediately to prevent timeout issues
      await interaction.deferReply();
      
      // Get the user and guild
      const user = interaction.user;
      const member = interaction.member;
      const guild = interaction.guild;
      
      // Check if the user is in a voice channel
      if (!member.voice.channel) {
        await interaction.editReply({ 
          content: 'You need to be in a voice channel to use this command.',
          ephemeral: true 
        });
        return;
      }
      
      // Get the voice channel the user is in
      const voiceChannel = member.voice.channel;
      
      // Get the meeting topic and duration
      const topic = interaction.options.getString('topic');
      const duration = interaction.options.getString('duration') || 'Not specified';
      
      // Find the Working role
      const workingRole = guild.roles.cache.find(role => role.name === 'Working');
      
      if (!workingRole) {
        await interaction.editReply({ 
          content: 'Could not find the "Working" role in this server.',
          ephemeral: true 
        });
        return;
      }
      
      // Get the current time
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
      
      // Create a rich embed for the meeting announcement
      const meetingEmbed = new EmbedBuilder()
        .setColor('#2196F3') // Blue color matching the In Meeting role
        .setTitle('🔔 MEETING ANNOUNCEMENT')
        .setDescription(`# ${user} has called a meeting in ${voiceChannel}`)
        .addFields(
          { name: '📋 Topic', value: topic, inline: false },
          { name: '⏱️ Expected Duration', value: duration, inline: true },
          { name: '⏰ Start Time', value: timeString, inline: true },
          { name: '📅 Date', value: dateString, inline: true },
          { name: '🔊 Voice Channel', value: `<#${voiceChannel.id}>`, inline: false },
          { name: '👥 Attendees', value: `All members with the ${workingRole} role are requested to join.` }
        )
        .setAuthor({ 
          name: user.tag, 
          iconURL: user.displayAvatarURL() 
        })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({ 
          text: 'F9 Global Discord Bot', 
          iconURL: interaction.client.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      // Edit the deferred reply with the meeting announcement
      await interaction.editReply({ 
        content: `<@&${workingRole.id}> Please join <#${voiceChannel.id}> for a meeting.`,
        embeds: [meetingEmbed] 
      });
      
      // Log the meeting announcement
      try {
        await logUserActivity(
          guild,
          user,
          '📣 MEETING CALLED',
          `# ${user} called a meeting in ${voiceChannel.name}`,
          '#2196F3', // Blue
          {
            'Topic': topic,
            'Duration': duration,
            'Voice Channel': voiceChannel.name
          }
        );
        
        console.log(`${user.tag} called a meeting in ${voiceChannel.name} with topic: ${topic}`);
      } catch (logError) {
        console.error('Error logging meeting activity:', logError);
        // Continue execution - logging is optional
      }
      
    } catch (error) {
      console.error('Error executing meeting command:', error);
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