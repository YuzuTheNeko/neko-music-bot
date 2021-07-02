import { Message, MessageButton, MessageComponentInteraction, MessageEmbed, Snowflake } from "discord.js";
import { ArgumentOptions, CommandData, Extras } from "../typings/typings";
import NekoClient from "./Client";
import { owners } from "../config.json"
import { noop } from "@discordjs/voice/dist/util/util";

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
            retries: 0, 
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
            console.error(error)
            message.channel.send(`An error occurred! ${error.message}`)
        }
    }

    async promptArg(message: Message, extras: Extras, arg: ArgumentOptions, input: any | undefined, invalid?: boolean, firstRetry?: boolean): Promise<undefined | any> {
        if (firstRetry) {
            extras.retries--
        }
        
        if (!input || invalid) {
            if (invalid) {
                const m = await message.channel.send(`Provided argument(s) \`${input?.replace(/`/g, "").slice(0, 100)}\` does not match argument \`${arg.name}\`, which takes a **${arg.type[0] + arg.type.slice(1).toLowerCase()}** as valid input.\nPlease try again inputting a valid argument this time.`)
            
                const filter = (m: Message) => m.author.id === message.author.id
    
                const collected = await message.channel.awaitMessages({ filter, time: this.data.prompt?.timeout, max: 1, errors: ["time"] })
                .catch(noop)
    
                if (!collected) {
                    const msg = this.data.prompt?.error?.(message)
    
                    message.channel.send(
                        msg ?? `${message.author} did not answer within ${require("ms-utility")(this.data.prompt?.timeout).toString()}.`
                    )
    
                    return undefined
                } 
    
                input = collected.first()?.content
    
                return await this.promptArg(message, extras, arg, input)
            }

            const m = await message.channel.send(`The command expects the \`${arg.name}\` argument, which takes a **${arg.type[0] + arg.type.slice(1).toLowerCase()}** as valid input.\nPlease provide this argument below.`)
            
            const filter = (m: Message) => m.author.id === message.author.id

            const collected = await message.channel.awaitMessages({ filter, time: this.data.prompt?.timeout, max: 1, errors: ["time"] })
            .catch(noop)

            if (!collected) {
                const msg = this.data.prompt?.error?.(message)

                message.channel.send(
                    msg ?? `${message.author} did not answer within ${require("ms-utility")(this.data.prompt?.timeout).toString()}.`
                )

                return undefined
            } 

            input = collected.first()?.content

            return await this.promptArg(message, extras, arg, input)
        }
        
        if (input === undefined) {
            message.channel.send(`${message.author} Internal error, prompt canceled.`)
            return undefined
        }

        const old = input

        const reject = async () => {
            extras.retries++ 

            if (extras.retries === this.data.prompt?.retries) {
                message.channel.send(`${message.author} too many retries, prompt canceled.`)
                return undefined
            }

            return await this.promptArg(message, extras, arg, old, true)
        }

        if (arg.type === "STRING") {
            if (arg.max) {
                if (input.length > arg.max) {
                    return await reject()
                }
            }

            if (arg.min) {
                if (input.length < arg.min) {
                    return await reject()
                }
            }

            if (arg.regexes) {
                if (!arg.regexes.every(reg => reg.test(input))) {
                    return await reject()
                }
            }
        } else if (arg.type === "USER") {
            input = await this.client?.users.fetch(input.replace(/[@!<>]/g, "") as Snowflake).catch(() => null)
            if (!input) return await reject()
        } else if (arg.type === "CHANNEL") {
            input = message.guild?.channels.cache.get(input.replace(/[#<>]/g, "") as Snowflake)
            if (!input) return await reject()
        } else if (arg.type === "MEMBER") {
            input = await message.guild?.members.fetch(input.replace(/[@!<>]/g, "") as Snowflake).catch(() => null)
            if (!input) return await reject()
        } else if (arg.type === "NUMBER") {
            const n = parseInt(input)
            if (isNaN(n)) return reject()
            if (arg.max) {
                if (n > arg.max) {
                    return await reject()
                }
            }

            if (arg.min) {
                if (n < arg.min) {
                    return await reject()
                }
            }
        } else if (arg.type === "TIME") {
            const ms = require("ms-utility")(input)
            if (!ms || !ms.ms) return await reject()
            else input = ms
        }

        extras.retries = 0

        return input as any
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
        
        if (arg.regexes) embed.addField(`Argument RegExp Tests`, arg.regexes.map(e => e.source).join("\n"))
        if (arg.min) embed.addField(`Argument Min. Length`, arg.min.toLocaleString())
        if (arg.max) embed.addField(`Arg Max. Length`, arg.max.toLocaleString())

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
            const prompt = this.promptArg.bind(this, message, extras, arg, current)
            
            let data: any = current || (arg.default ? arg.default(message) : undefined)

            if (!data && data !== false && data !== 0 && arg.required) {
                if (!this.data.prompt) {
                    return reject()
                } else {
                    data = await prompt()
                    if (data === undefined) return false
                    else args[i] = data
                    continue;
                }
            }

            if (!data && data !== false && data !== 0 && !arg.required) {
                if (arg.default !== undefined) {
                    args[i] = data
                }
                continue; 
            }

            if (this.data.prompt) {
                data = await prompt(false, true)
                if (data === undefined) return false
                else args[i] = data
                continue; 
            }

            if (arg.type === "STRING") {
                if (arg.max) {
                    if (data.length > arg.max) {
                        return reject()
                    }
                }

                if (arg.min) {
                    if (data.length < arg.min) {
                        return reject()
                    }
                }

                if (arg.regexes) {
                    if (!arg.regexes.every(reg => reg.test(data))) {
                        return reject()
                    }
                }
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
                if (arg.max) {
                    if (data > arg.max) {
                        return reject()
                    }
                }

                if (arg.min) {
                    if (data < arg.min) {
                        return reject()
                    }
                }
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