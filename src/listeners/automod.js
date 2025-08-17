import { Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

export class AutomodListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      event: "messageCreate",
    });

    // Your filter word list - edit this array
    this.bannedWords = [
      "nigger",
      "faggot",
      // Add your words here
    ];

    // Roles that bypass the filter
    this.bypassRoles = ["Moderator", "Admin", "Staff"];
  }

  async run(message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild || !message.content) return;

    // Check if user has bypass role
    if (this.hasBypassRole(message.member)) return;

    // Check if message contains any banned words
    const content = message.content.toLowerCase();
    const bannedWord = this.bannedWords.find((word) =>
      content.includes(word.toLowerCase())
    );

    if (bannedWord) {
      await this.sendWarning(message, bannedWord);
    }
  }

  hasBypassRole(member) {
    if (!member) return false;
    return this.bypassRoles.some((roleName) =>
      member.roles.cache.some((role) => role.name === roleName)
    );
  }

  async sendWarning(message, triggeredWord) {
    try {
      // Delete the message first
      await message.delete();

      // Create warning embed
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle("⚠️ Content Warning")
        .setDescription(
          "Your message contained filtered content and has been removed."
        )
        .addFields(
          { name: "Rule", value: "Inappropriate Language", inline: true },
          { name: "Server", value: message.guild.name, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "Please follow the server rules" });

      // Try to send DM to user
      try {
        await message.author.send({ embeds: [embed] });
        this.container.logger.info(
          `[AUTOMOD] Deleted message and warned ${message.author.tag} for using "${triggeredWord}"`
        );
      } catch (error) {
        // If DM fails, send in channel and delete after 10 seconds
        const warningMsg = await message.channel.send({
          content: `${message.author}, your message was removed. Please check your DMs for details.`,
          embeds: [embed],
        });

        setTimeout(() => warningMsg.delete().catch(() => {}), 10000);
        this.container.logger.info(
          `[AUTOMOD] Deleted message and warned ${message.author.tag} in channel (DM failed) for using "${triggeredWord}"`
        );
      }
    } catch (error) {
      this.container.logger.error("Error in automod (delete/warn):", error);
    }
  }
}
