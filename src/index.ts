import { Intents } from "discord.js"
import { token } from "./config.json"
import NekoClient from "./structures/Client"

const client = new NekoClient({
    intents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_MEMBERS",
        "GUILD_VOICE_STATES",
        "GUILD_MESSAGE_REACTIONS"
    ],
    partials: [
        "CHANNEL",
        "GUILD_MEMBER",
        "MESSAGE",
        "REACTION",
        "USER"
    ],
    presence: {
        activities: [
            {
                name: "music for everyone~",
                type: "PLAYING"
            }
        ],
        status: "idle"
    }
})

client.manager.loadEvents()

client.login(token)
