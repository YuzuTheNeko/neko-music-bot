import { AudioPlayer, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnection } from "@discordjs/voice";
import { Snowflake, TextChannel } from "discord.js";
import { createReadStream, createWriteStream, existsSync } from "fs";
import ytdl from "../../functions/ytdl";
import Command from "../../structures/Command";
const search = require("yt-search")
import ytfps from "ytfps";
import startWorker from "../../functions/worker";

export default new Command({
    name: "play",
    description: "idk",
    execute: async (client, message, args, command) => {
        let data; 

        if (!message.member?.voice.channel?.id) {
            return message.channel.send(`You have to be in a voice channel first!`)
        }

        const query = args.join(" ")

        if (/https?:/g.test(query)) {
            const id = query.split("/").reverse()[0]
            if (id.includes("list")) {
                data = await startWorker(`
                const ytfps = require("ytfps")
                const { parentPort } = require("worker_threads")
                parentPort.once("message", async (id) => {
                    const data = await ytfps(id.split("list=")[1].split("&")[0])

                    parentPort.postMessage(data)
                })
                `, id)
            } else {
                data = await startWorker(`
                const search = require("yt-search")
                const { parentPort } = require("worker_threads")
                parentPort.once("message", async (id) => {
                    const data = await search({ videoId: id.split("=")[1].split("&")[0] })

                    parentPort.postMessage({
                        title: data.title,
                        uri: data.videoId,
                        url: data.url, 
                        description: data.description,
                        duration: data.seconds * 1000
                    })
                })
                `, id)
            }
        } else {
            data = await startWorker(`
            const search = require("yt-search")
            const { parentPort } = require("worker_threads")
            parentPort.once("message", async (id) => {
                const data = await search(id).then(v => v.videos[0])

                parentPort.postMessage({
                    title: data.title,
                    uri: data.videoId,
                    url: data.url, 
                    description: data.description,
                    duration: data.seconds * 1000
                })
            })
            `, query)
        }

        if (!data) return message.channel.send(`Could not find any song to play-`)

        const audio = client.manager.audioFor(message.guild?.id as Snowflake)

        if (!audio.data.connection) {
            audio.joinVoice(message.member.voice.channel.id as string)
            audio.setChannel(message.channel as TextChannel)
        }

        const songs = Array.isArray(data.videos) ? data.videos.map((data: { milis_length: number, title: any; id: any; url: any; description: any; }) => {
            return {
                title: data.title,
                uri: data.id,
                url: data.url, 
                description: data.description,
                duration: data.milis_length
            }
        }) : data

        const status = audio.queue(songs, message.author)

        if (status) {
            message.channel.send(`Successfully queued ${Array.isArray(songs) ? `${songs.length} song${songs.length === 1 ? "" : "s"} from \`${data.title.replace(/`/g, "")}\`` : `\`${data.title.replace(/`/g, "")}\``}.`)
        } else {
            message.react("✅")
        }
    }
})