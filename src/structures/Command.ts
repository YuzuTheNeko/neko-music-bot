import { Message, MessageButton, MessageComponentInteraction, MessageEmbed, Snowflake } from "discord.js";
import { ArgumentOptions, CommandData, Extras } from "../typings/typings";
import NekoClient from "./Client";
import { owners } from "../config.json"

export default class Command {
    data: CommandData
    client?: NekoClient

    constructor(data: CommandData) {
        this.data = data
    }

    public async run(message: Message, args: any[], extras: Extras) {
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

        if (!command) {
            const button = new MessageButton()
            .setCustomID("idk")
            .setStyle("DANGER")
            .setLabel("Dismiss")

            const didYouMean = client.manager.commands.find(c => c.data.name.includes(cmd) || (c.data.aliases ? c.data.aliases.some(a => a.includes(cmd)) : false))

            const m = await message.reply({
                content: `That command does not exist!${didYouMean ? ` Did you mean to use \`${prefix}${didYouMean.data.name}\`?` : ""}`, 
                components: [[button]]
            }).catch(() => null)

            if (!m) return undefined

            const filter = (i: MessageComponentInteraction) => i.user.id === message.author.id
            
            await m.awaitMessageComponentInteraction({ filter, time: 15000 })
            .then(() => m.delete().catch(() => null))
            .catch(() => m.edit({
                content: m.content,
                components: []
            }).catch(() => null))

            return undefined
        }

        const extras: Extras = {
            prefix,
            command: cmd, 
            flags
        }

        try {
            const parsed_args: any[] | boolean = await command.argsFor(message, args, extras)

            if (typeof parsed_args === "boolean") return undefined

            const perms: boolean = await command.permissionsFor(message, args, extras, true)

            if (!perms) return undefined

            await command.run(message, parsed_args, extras)
        } catch (error) {
            message.channel.send(`An error occurred! ${error.message}`)
        }
    }

    onArgsError(message: Message, extras: Extras, arg: ArgumentOptions, input: string | undefined): boolean {
        const embed = new MessageEmbed()
        .setColor("RED")
        .setTimestamp()
        .setAuthor(message.author.tag, message.author.displayAvatarURL({dynamic:true}))
        .setFooter(`Bad usage!`)
        .setTitle(`Missing Argument Input`)
        .setDescription(
            input ? 
            `Provided argument(s) \`${input.replace(/`/g, "").slice(0, 100)}\` does not match type **${arg.type[0] + arg.type.slice(1).toLowerCase()}**.` : 
            arg.required ? 
            `This command expects the \`${arg.name}\` argument which takes a **${arg.type[0] + arg.type.slice(1).toLowerCase()}**.`
            :
            "None given"
        )

        if (arg.description) {
            embed.addField(`Argument Information`, arg.description[0].toUpperCase() + arg.description.slice(1))
        }

        if (arg.example) embed.addField(`Argument Example`, `\`${arg.example}\``)
        
        embed.addField(`Command Usage`, `\`\`\`\n${extras.prefix}${extras.command} ${this.data.args?.map(a => a.required ? `<${a.name}>` : `[${a.name}]`).join(" ")}\`\`\``)

        if (this.data.args?.every(c => c.example)) {
            embed.addField(`Command Usage (Example)`, `\`\`\`\n${extras.prefix}${extras.command} ${this.data.args?.map(a => a.example).join(" ")}\`\`\``)
        }

        message.channel.send({
            embeds: [
                embed
            ]
        }).catch(() => null)

        return false
    }

    async argsFor(message: Message, args: string[], extras: Extras): Promise<boolean | any[]> {
        if (this.data.args === undefined || this.data.args.length === 0) {
            return args
        }

        for (let i = 0;i < this.data.args.length;i++) {
            const arg: ArgumentOptions = this.data.args[i]
            const current: string = this.data.args[i+1] === undefined ? args.slice(i).join(" ") : args[i]

            const reject = this.onArgsError.bind(this, message, extras, arg, current)

            let data: any = current || (arg.default ? arg.default(message) : undefined)

            if (!data && data !== false && data !== 0 && arg.required) {
                return reject()    
            }

            if (!data && data !== false && data !== 0 && !arg.required) {
                if (arg.default !== undefined) {
                    args[i] = data
                }
                continue; 
            }

            if (arg.type === "STRING") {

            } else if (arg.type === "USER") {
                data = await this.client?.users.fetch(data.replace(/[@!<>]/g, "") as Snowflake).catch(() => null)
                if (!data) return reject()
            } else if (arg.type === "CHANNEL") {
                data = message.guild?.channels.cache.get(data.replace(/[#<>]/g, "") as Snowflake)
                if (!data) return reject()
            } else if (arg.type === "MEMBER") {
                data = await message.guild?.members.fetch(data.replace(/[@!<>]/g, "") as Snowflake).catch(() => null)
                if (!data) return reject()
            } else if (arg.type === "NUMBER") {
                const n = parseInt(data)
                if (isNaN(n)) return reject()
            } else if (arg.type === "TIME") {
                const ms = require("ms-utility")(data)
                if (!ms || !ms.ms) return reject()
                else data = ms
            }

            args[i] = data
        }

        return args
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