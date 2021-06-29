import { VoiceConnection } from "@discordjs/voice";
import { Channel, GuildMember, Message, TextChannel, User } from "discord.js";
import NekoClient from "../structures/Client";
import Command from "../structures/Command";
import Track from "../structures/Track";

export interface Extras {
    prefix: string
    flags: any
    command: string
}

export type LoopType = "NONE" | "SONG" | "QUEUE"

export enum LoopTypes {
    "NONE",
    "SONG",
    "QUEUE"
}

export interface GuildAudioData {
    volume: number
    songs: Track[]
    loopType: number
    connection?: VoiceConnection
    channel?: TextChannel
    lastMessage?: Message
    allSongs: Track[]
}

export interface ArgumentOptions {
    name: string 
    example?: string 
    default?: (m: Message) => any
    required?: boolean
    type: "USER" | "STRING" | "MEMBER" | "CHANNEL" | "TIME" | "NUMBER"
    min?: number
    max?: number
    description?: string
}

export interface TrackData {
    title: string 
    uri: string
    url: string
    duration: number
    description?: string
}

export interface CommandData {
    name: string
    description: string
    category?: string 
    owner?: boolean
    args?: ArgumentOptions[]
    aliases?: string[]

    execute(client: NekoClient, message: Message, args: Array<User | GuildMember | Channel | string | number>, command: Command, extras: Extras): unknown
}