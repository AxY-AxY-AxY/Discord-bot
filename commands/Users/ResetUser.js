const { SlashCommandBuilder, Colors, EmbedBuilder } = require("discord.js");
const db = require('../../utils/database');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reset-user")
        .setDescription("Reset a user HWID.")
        .setDescriptionLocalizations({
            "en-US": "Reset a users HWID.",
            "fi": "Nollaa käyttäjä",
            "fr": "Réinitialiser un utilisateur",
            "de": "Benutzer zurücksetzen",
            "it": "Reimposta un utente",
            "nl": "Reset een gebruiker",
            "ru": "Сбросить пользователя",
            "pl": "Zresetuj użytkownika",
            "tr": "Bir kullanıcıyı sıfırlayın",
            "cs": "Resetovat uživatele",
            "ja": "ユーザーをリセットする",
            "ko": "사용자를 재설정하십시오",
        })
        .addStringOption((option) =>
            option
                .setName("username")
                .setDescription("Username of the user you're HWID resetting.")
                .setRequired(true)
        ),
    async execute(interaction) {
        let idfrom = interaction.guild ? interaction.guild.id : interaction.user.id;
        let ephemeral = false; // Always make the response visible to everyone

        let sellerkey = await db.get(`token_${idfrom}`);
        if (sellerkey === null) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`Your \`SellerKey\` **has not been set!**\n In order to use this bot, you must run the \`/add-application\` Command First.`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                ],
                ephemeral: ephemeral
            });
        }

        let un = interaction.options.getString("username");

        // Check cooldown for the username
        const cooldownKey = `cooldown_${un}`;
        const lastUsed = await db.get(cooldownKey);
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (lastUsed && (now - lastUsed < cooldownTime)) {
            const remainingTime = cooldownTime - (now - lastUsed);
            const hours = Math.floor(remainingTime / (60 * 60 * 1000));
            const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Cooldown in Effect')
                        .setDescription(`You can reset this user again in ${hours} hours and ${minutes} minutes.`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                ],
                ephemeral: ephemeral
            });
        }

        fetch(`https://keyauth.win/api/seller/?sellerkey=${sellerkey}&type=resetuser&user=${un}`)
            .then(res => res.json())
            .then(async json => {
                if (json.success) {
                    // Update the last used time in the database for the username
                    await db.set(cooldownKey, Date.now());

                    // Send embed to a specific channel
                    sendEmbedToChannel(interaction, un);
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('User HWID successfully reset!')
                                .addFields([{ name: 'Username:', value: `\`${un}\`` }])
                                .setColor(Colors.Green)
                                .setTimestamp()
                        ],
                        ephemeral: ephemeral
                    });
                } else {
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(json.message)
                                .addFields([{ name: 'Note:', value: `Your seller key is most likely invalid. Change your seller key with \`/add-application\` command.` }])
                                .setColor(Colors.Red)
                                .setFooter({ text: "KeyAuth Discord Bot" })
                                .setTimestamp()
                        ],
                        ephemeral: ephemeral
                    });
                }
            });
    },
};

async function sendEmbedToChannel(interaction, username) {
    // Replace with your channel ID or find the channel programmatically
    const channelId = '1257570430605332480';
    const channel = interaction.client.channels.cache.get(channelId);
    
    if (!channel) {
        console.error(`Channel with ID ${channelId} not found.`);
        return;
    }

    // Create embed message
    const embedMessage = new EmbedBuilder()
        .setTitle('Command Executed')
        .setDescription(`Command executed by ${interaction.user.tag}\nUsername: ${username}`)
        .setColor(Colors.Blue)
        .setTimestamp();

    // Send embed message
    try {
        await channel.send({ embeds: [embedMessage] });
    } catch (error) {
        console.error('Error sending message to channel:', error);
    }
}
