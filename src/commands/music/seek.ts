import { Snowflake } from "discord.js";
import Command from "../../structures/Command";
const parse = require("ms-utility")

export default new Command({
    name: "seek",
    description: "seek current song.",
    execute: async (client, message, args) => {        
        const audio = client.manager.audio.get(message.guild?.id as Snowflake)

        if (!audio) return message.channel.send(`There is no song playing for this guild.`)
        
        if (!message.member?.voice.channel?.id) return message.channel.send(`You have to be in a voice channel first.`)

        if (audio.data.connection?.joinConfig.channelId !== (message.member?.voice.channel?.id as string)) return message.channel.send(`You have to be in the same voice channel as me!`)

        const time = parse.parseString(args[0])

        if (!time) return message.channel.send(`Please give a valid seek time.`)

        const dur = audio.data.songs[0].data.duration

        if (dur <= time) return message.channel.send(`You cannot seek this song for longer than ${parse.parseMS(dur).toString()}`)
        
        const seeked = await audio.seek(time / 1000 + "s")

        if (!seeked) {
            return message.channel.send(`Unable to seek right now.`)
        } else {
            message.react("✅")
        }
    }
})