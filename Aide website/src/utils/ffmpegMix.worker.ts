import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

type MixRequest = {
  id: string
  speechUrl: string
  bgUrl: string
  bgVolume: number
}

type MixResponse =
  | { id: string; ok: true; data: ArrayBuffer }
  | { id: string; ok: false; error: string }

let ffmpeg: FFmpeg | null = null
let loading: Promise<void> | null = null

const load = async () => {
  if (ffmpeg) return
  ffmpeg = new FFmpeg()
  const coreURL = await toBlobURL(
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    'text/javascript'
  )
  const wasmURL = await toBlobURL(
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
    'application/wasm'
  )
  await ffmpeg.load({ coreURL, wasmURL })
}

self.onmessage = async (event: MessageEvent<MixRequest>) => {
  const { id, speechUrl, bgUrl, bgVolume } = event.data
  try {
    if (!loading) loading = load()
    await loading
    const speechData = new Uint8Array(await (await fetch(speechUrl)).arrayBuffer())
    const bgData = new Uint8Array(await (await fetch(bgUrl)).arrayBuffer())
    await ffmpeg!.writeFile('speech.mp3', speechData)
    await ffmpeg!.writeFile('bg.mp3', bgData)
    const volume = Math.max(0, Math.min(1, bgVolume ?? 0.2))
    await ffmpeg!.exec([
      '-i',
      'speech.mp3',
      '-i',
      'bg.mp3',
      '-filter_complex',
      `[1:a]volume=${volume}[bg];[0:a][bg]amix=inputs=2:duration=longest:dropout_transition=2`,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '2',
      'out.mp3'
    ])
    const out = await ffmpeg!.readFile('out.mp3')
    const buffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
    const message: MixResponse = { id, ok: true, data: buffer }
    ;(self as DedicatedWorkerGlobalScope).postMessage(message, [buffer])
  } catch (err) {
    const message: MixResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
    ;(self as DedicatedWorkerGlobalScope).postMessage(message)
  }
}
