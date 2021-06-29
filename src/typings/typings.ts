import { VoiceConnection } from "@discordjs/voice";
import { Message, TextChannel } from "discord.js";
import NekoClient from "../structures/Client";
import Command from "../structures/Command";
import Track from "../structures/Track";

export interface Extras {
    prefix: string
    flags: any
    command: Command
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
    args?: string[]
    aliases?: string[]

    execute(client: NekoClient, message: Message, args: string[], command: Command, extras: Extras): unknown
}