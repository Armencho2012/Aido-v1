type MixResult = { id: string; ok: true; data: ArrayBuffer } | { id: string; ok: false; error: string }

type Pending = {
  resolve: (url: string) => void
  reject: (error: Error) => void
}

const worker = new Worker(new URL('./ffmpegMix.worker.ts', import.meta.url), { type: 'module' })
const pending = new Map<string, Pending>()

worker.onmessage = (event: MessageEvent<MixResult>) => {
  const message = event.data
  const entry = pending.get(message.id)
  if (!entry) return
  pending.delete(message.id)
  if (!message.ok) {
    entry.reject(new Error(message.error))
    return
  }
  const blob = new Blob([message.data], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  entry.resolve(url)
}

export const mixSpeechWithBackground = (
  speechUrl: string,
  bgUrl = '/background-music.mp3',
  bgVolume = 0.2
) => {
  const id = crypto.randomUUID()
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, speechUrl, bgUrl, bgVolume })
  })
}

export const terminateAudioMixWorker = () => {
  worker.terminate()
  pending.clear()
}
