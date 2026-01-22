export type JsRunResult = {
  logs: string[]
  error: string | null
  timedOut: boolean
}

export function runJavaScript(source: string, timeoutMs = 1200): Promise<JsRunResult> {
  return new Promise((resolve) => {
    const worker = createWorker()
    const logs: string[] = []
    let finished = false

    const timer = window.setTimeout(() => {
      if (finished) return
      finished = true
      worker.terminate()
      resolve({ logs, error: null, timedOut: true })
    }, timeoutMs)

    worker.onmessage = (event: MessageEvent<JsRunResult | { log: string }>) => {
      if ('log' in event.data) {
        logs.push(event.data.log)
        return
      }
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      worker.terminate()
      resolve({ ...event.data, logs })
    }

    worker.onerror = (event) => {
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      worker.terminate()
      resolve({ logs, error: event.message, timedOut: false })
    }

    worker.postMessage({ source })
  })
}

function createWorker() {
  const code = `
    self.onmessage = (event) => {
      const logs = []
      const originalLog = console.log
      console.log = (...args) => {
        const msg = args.map((item) => String(item)).join(' ')
        logs.push(msg)
        self.postMessage({ log: msg })
      }
      try {
        const fn = new Function(event.data.source)
        fn()
        self.postMessage({ logs, error: null, timedOut: false })
      } catch (error) {
        self.postMessage({ logs, error: String(error), timedOut: false })
      } finally {
        console.log = originalLog
      }
    }
  `
  const blob = new Blob([code], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  return new Worker(url, { name: 'miniko-js-sandbox' })
}
