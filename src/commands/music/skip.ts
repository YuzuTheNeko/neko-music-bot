import { Snowflake } from "discord.js";
import Command from "../../structures/Command";

export default new Command({
    name: "skip",
    description: "skip current song.",
    execute: async (client, message, args) => {
        const audio = client.manager.audio.get(message.guild?.id as Snowflake)

        if (!audio) return message.channel.send(`I am not playing any song.`)

        if (!message.member?.voice.channel?.id) return message.channel.send(`You have to be in a voice channel first.`)

        if (audio.data.connection?.joinConfig.channelId !== (message.member?.voice.channel?.id as string)) return message.channel.send(`You have to be in the same voice channel as me!`)

        audio.player.stop()

        message.react("✅")
    }
})