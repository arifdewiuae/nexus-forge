import { ref } from 'vue'

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart:  (() => void) | null
  onend:    (() => void) | null
  onerror:  ((e: { error: string }) => void) | null
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  start(): void
  stop(): void
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionLike
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as Record<string, unknown>
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null) as SpeechRecognitionConstructor | null
}

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const isListening = ref(false)
  const error       = ref('')
  let recognition: SpeechRecognitionLike | null = null

  function start() {
    error.value = ''
    const SR = getSpeechRecognition()
    if (!SR) {
      error.value = 'Speech recognition not supported in this browser.'
      return
    }
    recognition = new SR()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onstart  = () => { isListening.value = true }
    recognition.onend    = () => { isListening.value = false }
    recognition.onerror  = (e) => {
      isListening.value = false
      if (e.error !== 'aborted') error.value = `Mic error: ${e.error}`
    }
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0]?.transcript ?? '')
        .join(' ')
      onTranscript(transcript)
    }
    recognition.start()
  }

  function stop() {
    recognition?.stop()
  }

  function toggle() {
    if (isListening.value) stop(); else start()
  }

  return { isListening, error, start, stop, toggle }
}
