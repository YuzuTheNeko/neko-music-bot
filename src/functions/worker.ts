import { Worker, parentPort } from "worker_threads"

export default function startWorker(code: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(code, {
            eval: true 
        })

        worker.once("message", (data) => {
            worker.removeAllListeners()
            worker.terminate()
            resolve(data)
        })

        worker.once("error", (err) => {
            worker.terminate()
            worker.removeAllListeners()
            reject(err)
        })

        worker.postMessage(url)
    })
}