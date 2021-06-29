import { createAudioResource, demuxProbe, ProbeInfo } from '@discordjs/voice';
import { raw as ytdl } from 'youtube-dl-exec';

export default function(url: string): Promise<ProbeInfo> {
    return new Promise((resolve, reject) => {
        const process = ytdl(
            url,
            {
                o: '-',
                q: '',
                f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                r: '100K',
            },
            { stdio: ['ignore', 'pipe', 'ignore'] },
        );
        if (!process.stdout) {
            reject(new Error('No stdout'));
            return;
        }
        const stream = process.stdout;
        const onError = (error: Error) => {
            if (!process.killed) process.kill();
            stream.resume();
            reject(error);
        };
        process
            .once('spawn', () => {
                demuxProbe(stream)
                    .then((probe) => resolve(probe))
                    .catch(onError);
            })
            .catch(onError);
    });
}