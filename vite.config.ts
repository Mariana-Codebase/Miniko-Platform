import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.OPENROUTER_API_KEY ?? env.VITE_MINIKO_AI_TOKEN
  const model = env.OPENROUTER_MODEL ?? 'liquid/lfm-2.5-1.2b-thinking:free'
  const baseUrl = env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

  return {
    server: {
      port: 5173,
    },
    plugins: [
      {
        name: 'miniko-ai-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai/status', (_req, res) => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                hasKey: Boolean(apiKey),
                model,
              })
            )
          })

          server.middlewares.use('/api/ai', async (req, res) => {
            const method = (req as { method?: string }).method
            if (method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            if (!apiKey) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing API key' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            await new Promise((resolve) => req.on('end', resolve))

            let payload: { code?: string; prompt?: string; locale?: string }
            try {
              payload = JSON.parse(body)
            } catch {
              res.statusCode = 400
              res.end('Invalid JSON')
              return
            }

            const prompt =
              payload.prompt ??
              (payload.locale === 'es' ? 'Explica el flujo de ejecución.' : 'Explain the execution flow.')
            const code = payload.code ?? ''
            const system =
              payload.locale === 'es'
                ? 'Responde la pregunta del usuario primero y de forma clara, basándote solo en el código. Si no se puede responder con el código, dilo explícitamente. Luego explica el código en un texto fluido y detallado, pensado para alguien que no sabe programar. Evita jerga técnica sin explicarla con palabras simples. No uses listas ni títulos, solo párrafos breves. No inventes valores; ignora comentarios; si algo no se puede inferir, dilo.'
                : 'Answer the user question first and clearly, based only on the code. If it cannot be answered from the code, say so explicitly. Then explain the code in a smooth, detailed text for someone who does not know programming. Avoid jargon unless you explain it simply. No lists or headings, just short paragraphs. Do not invent values; ignore comments; if something cannot be inferred, say so.'

            try {
              const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                  'HTTP-Referer': env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:5173',
                  'X-Title': env.OPENROUTER_APP_TITLE ?? 'Miniko',
                },
                body: JSON.stringify({
                  model,
                  temperature: 0.2,
                  messages: [
                    { role: 'system', content: system },
                    {
                      role: 'user',
                      content: `User question:\n${prompt}\n\nCode:\n${code}`,
                    },
                  ],
                }),
              })

              if (!response.ok) {
                const text = await response.text()
                res.statusCode = response.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: text }))
                return
              }

              const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[]
              }
              const answer = data.choices?.[0]?.message?.content ?? ''

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ answer }))
            } catch (error) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: String(error) }))
            }
          })
        },
      },
    ],
  }
})
