import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, joinVoiceChannel, PlayerSubscription, ProbeInfo, StreamType, VoiceConnection } from "@discordjs/voice";
import { Collection, Guild, Snowflake, TextChannel, User } from "discord.js";
import { createWriteStream, existsSync, stat } from "fs";
import ytdl from "../functions/ytdl";
import { GuildAudioData, TrackData } from "../typings/typings";
import Manager from "./Manager";
import Track from "./Track";
import { FFmpeg } from "prism-media";

export default class GuildAudioPlayer {
    manager: Manager
    guildID: Snowflake
    resource?: AudioResource 
    data: GuildAudioData
    player = createAudioPlayer()
    saveQueue = new Collection<string, Track>()
    subscribedPlayer?: PlayerSubscription
    wasForced = false

    constructor(manager: Manager, guildID: Snowflake) {
        this.manager = manager

        this.guildID = guildID

        this.data = GuildAudioPlayer.defaultAudioData
    } 

    onError(err: any) {
        console.error(err)
        this.data.channel?.send(`An error occurred. ${err.message ?? ""}`)
        this.destroy()
    }

    joinVoice(channelID: string): VoiceConnection {
        const connection = joinVoiceChannel({
            guildId: this.guildID as string,
            channelId: channelID,
            adapterCreator: this.guild.voiceAdapterCreator
        })

        this.data.connection = connection

        return connection
    }

    leaveVoice(): boolean {
        return this.destroy()
    }

    queue(track: TrackData[] | TrackData, user?: User): number {
        const status = this.data.songs.length

        if (!Array.isArray(track)) {
            return this.queue([track], user)
        } else {
            for (const trk of track) {
                this.data.songs.push(new Track(trk, this, user))
                this.data.allSongs.push(new Track(trk, this, user))
            }
        }

        if (status === 0) {
            this.play()
        } 

        return status
    }

    setChannel(channel: TextChannel): boolean {
        this.data.channel = channel
        return true
    }

    onFinish() {
        delete this.resource

        this.data.lastMessage?.delete().catch(() => null)

        if ([0, 2].includes(this.data.loopType)) this.data.songs.shift()

        if (!this.data.songs.length) {
            if (this.data.loopType === 0) {
                this.destroy()
                this.data.channel?.send(`Queue ended, left voice channel.`)
                return 
            } else if (this.data.loopType === 1) {
                //do nothing because this won't happen lmao
            } else if (this.data.loopType === 2) {
                this.data.allSongs.map(t => this.data.songs.push(t))
            }
        }

        this.play()
    }

    async onStart() {
        if (this.wasForced) {
            return this.wasForced = false
        }
        const track = this.data.songs[0]
        this.data.lastMessage = await this.data.channel?.send(`Playing now \`${track.data.title.replace(/`/g, "")}\`-`)
        return undefined
    }

    subscribe(): PlayerSubscription | undefined {
        if (this.subscribedPlayer) return this.subscribedPlayer
        this.subscribedPlayer = this.data.connection?.subscribe(this.player)
        
        this.player.on("error", this.onError.bind(this))
        this.player.on("stateChange", (oldS, newS) => {
            if (oldS.status === AudioPlayerStatus.Buffering && newS.status === AudioPlayerStatus.Playing) {
                this.onStart()
            } else if (oldS.status === AudioPlayerStatus.Playing && newS.status === AudioPlayerStatus.Idle) {
                this.onFinish()
            } else if (oldS.status === AudioPlayerStatus.Playing && newS.status === AudioPlayerStatus.Buffering) {
                this.wasForced = true
            }
        })

        if (!this.subscribedPlayer) return undefined
        return this.subscribedPlayer
    }

    async play() {
        const subscription = this.subscribe()

        if (!subscription) return undefined

        const track = this.data.songs[0]

        const buffer = await this.getSongStream(track)

        if (!buffer) return undefined

        if (buffer instanceof AudioResource) {
            this.player.play(buffer)
        }
        /**
         *  else {
            return undefined
            const resource = createAudioResource(buffer.stream, {
                metadata: this,
                inputType: buffer.type
            })

            this.player.play(resource)
        }
         * 
         */
    }

    async seek(time: string) {
        const stream = await this.getSongStream(this.data.songs[0], time)

        if (!stream) return stream

        this.player.play(stream as AudioResource)

        return true
    }

    static get defaultAudioData(): GuildAudioData {
        return {
            songs: [],
            allSongs: [],
            loopType: 0,
            volume: 100
        }
    }

    public get guild(): Guild {
        return this.manager.client.guilds.cache.get(this.guildID) as Guild
    }

    static get FFMPEG_ARGUMENTS(): string[] {
        return [
            '-analyzeduration', '0',
            '-loglevel', '0',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
        ];
    }

    saveSong(track: Track): Promise<boolean | undefined> {
        return Promise.resolve(undefined)
    }

    async getSongStream(track: Track, seekTime?: string) {
        if (this.resource && seekTime) {
            const resource = this.resource

            const stream = new FFmpeg({
                args: ["-ss", seekTime],
            });

            resource.playStream.pipe(stream)

            return resource
        } else if (seekTime) {
            return false
        } else {
            const resource = await ytdl(track.data.url)

            const stream = new FFmpeg({
                args: GuildAudioPlayer.FFMPEG_ARGUMENTS
            })

            resource.stream.pipe(stream)

            this.resource = createAudioResource(stream, {
                inputType: StreamType.Raw,
                inlineVolume: true
            })
            
            return createAudioResource(resource.stream, {
                inlineVolume: true,
                inputType: resource.type
            })
        }
    }

    destroy(): boolean {
        this.manager.audio.delete(this.guildID)
        this.player.removeAllListeners()
        this.data.connection?.disconnect()
        return true
    }
}