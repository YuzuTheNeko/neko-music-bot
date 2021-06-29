import { Message } from "discord.js";
import { CommandData, Extras } from "../typings/typings";
import NekoClient from "./Client";
import { owners } from "../config.json"

export default class Command {
    data: CommandData
    client?: NekoClient

    constructor(data: CommandData) {
        this.data = data
    }

    public async run(message: Message, args: string[], extras: Extras) {
        if (!this.client) {
            throw new Error(`Missing client in command ${this.data.name}.`)
        }

        return await this.data.execute(this.client, message, args, this, extras)
    }

    public async permissionsFor(message: Message, args: string[], extras: Extras, sendMessage: boolean = false): Promise<boolean> {
        if (this.data.category === "developer" && !owners.includes(message.author.id)) {
            if (sendMessage) {
                message.channel.send(`:x:`)
            }

            return false
        }

        return true
    }

    static async handle(client: NekoClient, message: Message) {
        if (message.author.bot || message.channel.type === "dm") return undefined

        const prefix = client.manager.prefixes.find(p => message.content.toLowerCase().startsWith(p))

        if (!prefix) return undefined

        const { content, flags } = Command.parseFlags(message.content)

        const args = content.slice(prefix.length).trim().split(/ +/)

        const cmd = args.shift()?.toLowerCase()

        if (!cmd) return undefined

        const command = client.manager.commands.get(cmd) ?? client.manager.commands.find(c => c.data.name.replace(/-/g, "") === cmd?.replace(/-/g, "") || (c.data.aliases ? c.data.aliases.includes(cmd) : false)) 

        if (!command) return undefined

        const extras: Extras = {
            prefix,
            command, 
            flags
        }

        try {
            const perms: boolean = await command.permissionsFor(message, args, extras, true)

            if (!perms) return undefined

            await command.run(message, args, extras)
        } catch (error) {
            message.channel.send(`An error occurred! ${error.message}`)
        }
    }

    static parseFlags(content: string) {
        const flags: any = {}

        for (const after of content.split("--").slice(1)) {

            const [
                name,
                value = true
            ] = after.split(" ")[0].split(":")

            if (!name) {
                continue
            }

            flags[name] = value

            content = content.replace("--" + after.split(" ")[0], "").trim()
        }

        return (
            {
                content,
                flags
            }
        )
    }
}