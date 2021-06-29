import { Collection, Snowflake } from "discord.js";
import { readdir, readdirSync } from "fs";
import NekoClient from "./Client";
import Command from "./Command";
import { prefix } from "../config.json"
import GuildAudioPlayer from "./GuildAudioPlayer";

export default class Manager {
    client: NekoClient
    commands = new Collection<string, Command>()
    audio = new Collection<Snowflake, GuildAudioPlayer>()

    constructor(client: NekoClient) {
        this.client = client
    }

    public audioFor(guildID: Snowflake) {
        const audio = this.audio.get(guildID) 
        if (!audio) {
            const audio = new GuildAudioPlayer(this, guildID)
            this.audio.set(guildID, audio)
            return audio
        } else return audio
    }

    public loadEvents(removeCache?: boolean) {
        for (const file of readdirSync("./dist/events/")) {
            const name = file.split(".")[0]

            const path = `../events/${file}`

            if (removeCache) {
                delete require.cache[require.resolve(path)]
            }

            const fn = require(path).default as Function

            this.client.on(name, fn.bind(null, this.client))
        }
    }

    public get prefixes(): string[] {
        const prefixes = [this.client.user?.username.toLowerCase().replace(/bot/g, "").trim() as string, prefix, this.client.user?.username.toLowerCase() as string, this.client.user?.toString() as string, this.client.user?.toString().replace("@", "@!") as string]

        return prefixes
    }

    public loadCommands(removeCache?: boolean) {
        for (const folder of readdirSync("./dist/commands/")) {
            for (const file of readdirSync(`./dist/commands/${folder}/`)) {
                const path = `../commands/${folder}/${file}`

                if (removeCache) {
                    delete require.cache[require.resolve(path)]
                }

                const command: Command = require(path).default 

                command.client = this.client

                if (!command.data.category) {
                    command.data.category = folder
                }

                if (command.data.category === "developer") {
                    command.data.owner = true
                }

                this.commands.set(command.data.name, command)
            }
        }
    }
}