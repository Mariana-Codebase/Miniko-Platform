import { useEffect, useMemo, useRef, useState } from 'react'
import './style.css'
import { useI18n } from './i18n'
import type { MinikoTraceEntry } from './lib/minikoInterpreter'
import type { JsRunResult } from './lib/jsSandbox'

const DEFAULT_CODE = `# Python Demo - Listas y bucles
numeros = [10, 20, 30, 40, 50]
suma = 0
for num in numeros:
  suma += num
  print(f"Sumando {num}, total: {suma}")
print(f"Suma final: {suma}")`

const DEFAULT_JAVA = `public class Main {
  public static void main(String[] args) {
    int[] numeros = {5, 10, 15, 20};
    int maximo = numeros[0];
    for (int i = 1; i < numeros.length; i++) {
      if (numeros[i] > maximo) {
        maximo = numeros[i];
      }
    }
    System.out.println("El máximo es: " + maximo);
  }
}`

const DEFAULT_TS = `// TypeScript Demo - Funciones y tipos
function calcularPromedio(numeros: number[]): number {
  let suma = 0;
  for (let i = 0; i < numeros.length; i++) {
    suma += numeros[i];
  }
  return suma / numeros.length;
}
const valores = [10, 20, 30, 40];
const promedio = calcularPromedio(valores);
console.log("Promedio:", promedio);`

const DEFAULT_C = `// C Demo - Arrays y búsqueda
#include <stdio.h>
int main() {
  int arr[] = {3, 7, 2, 9, 5};
  int buscar = 9;
  int encontrado = 0;
  for (int i = 0; i < 5; i++) {
    if (arr[i] == buscar) {
      encontrado = 1;
      printf("Encontrado en posición %d\\n", i);
    }
  }
  if (!encontrado) {
    printf("No encontrado\\n");
  }
  return 0;
}`

const DEFAULT_CPP = `#include <iostream>

int main() {
int factorial = 1;
int n = 5;
for (int i = 1; i <= n; i++) {
  factorial *= i;
  std::cout << "Factorial de " << i << " = " << factorial << std::endl;
}
return 0;
}`

const DEFAULT_CS = `// C# Demo - Listas y filtrado
using System;
class Program {
  static void Main() {
    int[] numeros = {12, 5, 8, 15, 3, 20};
    int contador = 0;
    for (int i = 0; i < numeros.Length; i++) {
      if (numeros[i] > 10) {
        contador++;
        Console.WriteLine(numeros[i]);
      }
    }
    Console.WriteLine(contador);
  }
}`

const DEFAULT_GO = `// Go Demo - Slices y funciones
package main
import "fmt"
func main() {
  numeros := []int{2, 4, 6, 8, 10}
  producto := 1
  for i := 0; i < len(numeros); i++ {
    producto *= numeros[i]
    fmt.Println("Multiplicando", numeros[i], "producto", producto)
  }
  fmt.Println("Producto final", producto)
}`

const DEFAULT_RUST = `// Rust Demo - Vectores y iteración
fn main() {
  let numeros = vec![1, 3, 5, 7, 9];
  let mut suma_pares = 0;
  let mut suma_impares = 0;
  for num in numeros {
    if num % 2 == 0 {
      suma_pares += num;
    } else {
      suma_impares += num;
    }
  }
  println!("Suma impares: {}", suma_impares);
  println!("Suma pares: {}", suma_pares);
}`

type Runnable = 'js' | null
type DetectedLanguage = {
  id: string
  label: string
  runnable: Runnable
}
type TraceValue = number | string | number[]
const MAX_STEPS = 15
type VisualTraceEntry = MinikoTraceEntry & {
  before: Record<string, TraceValue>
  after: Record<string, TraceValue>
  action: string
  outputsBefore: string[]
  outputsAfter: string[]
  outputLine?: string
  op?: {
    left: string
    operator: string
    right: string
    result: number
    target: string
  }
}

export function App() {
  const { locale, setLocale, t } = useI18n()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('miniko-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const year = new Date().getFullYear()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [genericTrace, setGenericTrace] = useState<VisualTraceEntry[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [jsResult, _setJsResult] = useState<JsRunResult | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiCode, setAiCode] = useState(code)
  const lastSyncedCodeRef = useRef(code)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark')
    localStorage.setItem('miniko-theme', theme)
  }, [theme])

  const safetyNote = useMemo(() => t('safetyNote'), [t])

  const detected = useMemo(() => detectLanguage(code, locale), [code, locale])

  useEffect(() => {
    const trace = buildTraceForCode(code, detected.id, locale)
    setGenericTrace(trace)
    setActiveStep(trace.length > 0 ? 0 : 0)
  }, [code, locale, detected.id])

  useEffect(() => {
    if (aiCode === lastSyncedCodeRef.current) {
      setAiCode(code)
      lastSyncedCodeRef.current = code
    }
  }, [code, aiCode])

  const handleAiExplain = async () => {
    setAiStatus('loading')
    setAiAnswer('')

    const prompt = aiPrompt || t('aiDefaultPrompt')
    const workingCode = aiCode
    const aiDetected = detectLanguage(workingCode, locale)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale, code: workingCode, prompt }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Remote AI not available')
      }

      const data = (await response.json()) as { answer?: string }
      const rawAnswer = data.answer ?? t('aiFallback')
      const finalAnswer = normalizeAiAnswer(rawAnswer, prompt, workingCode, aiDetected.id, locale)
      setAiAnswer(finalAnswer)
      setAiStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      let friendlyMessage = message
      const trimmed = message.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed) as {
            error?: { code?: number; message?: string }
          }
          if (parsed?.error?.code === 429) {
            friendlyMessage = t('aiRateLimited')
          } else if (parsed?.error?.code === 402) {
            friendlyMessage = t('aiInsufficientCredits')
          } else if (parsed?.error?.message) {
            friendlyMessage = parsed.error.message
          }
        } catch {
          friendlyMessage = message
        }
      } else if (/rate-?limit/i.test(message)) {
        friendlyMessage = t('aiRateLimited')
      } else if (/credits|insufficient|402/i.test(message)) {
        friendlyMessage = t('aiInsufficientCredits')
      }
      const quick = buildLocalExplanation(workingCode, locale)
      const fallback = normalizeAiAnswer(quick, prompt, workingCode, aiDetected.id, locale)
      setAiAnswer(`${t('aiError')}\n${friendlyMessage}\n\n${fallback}`)
      setAiStatus('error')
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-title">
          <span className="hero-badge">Miniko</span>
          <h1>{t('title')}</h1>
          <p className="hero-subtitle">{t('subtitle')}</p>
          <div className="supported">
            <span className="supported-label">{t('supportedLabel')}</span>
            <span className="supported-chip">Python</span>
            <span className="supported-chip">TypeScript</span>
            <span className="supported-chip">Java</span>
            <span className="supported-chip">C</span>
            <span className="supported-chip">C++</span>
            <span className="supported-chip">C#</span>
            <span className="supported-chip">Go</span>
            <span className="supported-chip">Rust</span>
          </div>
        </div>
        <div className="hero-actions">
          <div className="toggle-group">
            <span className="toggle-label">{t('language')}</span>
            <div className="toggle-pills">
              <button
                className={locale === 'es' ? 'pill-btn active' : 'pill-btn'}
                onClick={() => setLocale('es')}
              >
                ES
              </button>
              <button
                className={locale === 'en' ? 'pill-btn active' : 'pill-btn'}
                onClick={() => setLocale('en')}
              >
                EN
              </button>
            </div>
          </div>
          <div className="toggle-group">
            <span className="toggle-label">{t('theme')}</span>
            <div className="toggle-pills">
              <button
                className={theme === 'light' ? 'pill-btn active' : 'pill-btn'}
                onClick={() => setTheme('light')}
              >
                {t('themeLight')}
              </button>
              <button
                className={theme === 'dark' ? 'pill-btn active' : 'pill-btn'}
                onClick={() => setTheme('dark')}
              >
                {t('themeDark')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-head">
            <div>
              <h2>{t('blocksTitle')}</h2>
              <p>{t('blocksDesc')}</p>
            </div>
            <button className="btn" onClick={() => setAiOpen(true)}>
              {t('aiExplainBtn')}
            </button>
          </div>
          <div className="panel-body editor-block">
            <div className="detect-row">
              <span className="detect-label">{t('detected')}</span>
              <span className="detect-pill">{detected.label}</span>
            </div>
            <textarea
              className="code-editor"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
            />
            <div className="row">
              <span className="helper">{safetyNote}</span>
            </div>
          </div>
        </div>

        <div className="panel trace-panel">
          <div className="panel-head">
            <div>
              <h2>{t('logicTitle')}</h2>
              <p>{t('logicDesc')}</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="stepper">
              <button
                className="btn"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                disabled={genericTrace.length === 0 || activeStep <= 0}
              >
                {t('stepBack')}
              </button>
              <span className="stepper-count">
                {(genericTrace.length ? activeStep + 1 : 0)} / {genericTrace.length || 0}
              </span>
              <button
                className="btn"
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, genericTrace.length - 1))}
                disabled={genericTrace.length === 0 || activeStep >= genericTrace.length - 1}
              >
                {t('stepForward')}
              </button>
            </div>

            {genericTrace.length === 0 ? (
              <div className="empty">{t('noTrace')}</div>
            ) : (
              <div className="pythontutor-layout">
                <div className="code-viewer">
                  <div className="code-viewer-title">{t('code')}</div>
                  <div className="code-lines">
                    {code.split('\n').map((line, index) => {
                      const currentTrace = genericTrace[activeStep]
                      const matchingIndex = currentTrace ? findMatchingLineIndex(code, currentTrace.line) : null
                      const isActive = matchingIndex === index
                      return (
                        <div key={index} className={`code-line ${isActive ? 'active' : ''}`}>
                          <span className="line-number">{index + 1}</span>
                          <code className="line-content">{line || ' '}</code>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="frames-heap">
                  <div className="frames-section">
                    <div className="section-title">{t('frames')}</div>
                    <div className="frame-card">
                      <div className="frame-name">main()</div>
                      <div className="frame-vars">
                        {Object.entries(genericTrace[activeStep]?.after ?? {}).map(([key, value]) => (
                          <div key={key} className="frame-var">
                            <span className="var-name">{key}</span>
                            <span className="var-value">{stringifyValue(value)}</span>
                          </div>
                        ))}
                        {Object.keys(genericTrace[activeStep]?.after ?? {}).length === 0 && (
                          <div className="empty">{t('noVariables')}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="heap-section">
                    <div className="section-title">{t('state')}</div>
                    <div className="heap-objects">
                      {(() => {
                        const before = genericTrace[activeStep]?.before ?? {}
                        const after = genericTrace[activeStep]?.after ?? {}
                        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
                        const changes: Array<{ key: string; before?: TraceValue; after?: TraceValue }> = []
                        
                        for (const key of allKeys) {
                          const beforeValue = before[key]
                          const afterValue = after[key]
                          if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
                            changes.push({ key, before: beforeValue, after: afterValue })
                          }
                        }
                        
                        if (changes.length === 0) {
                          return <div className="empty">{t('noChanges')}</div>
                        }
                        
                        return changes.map((change) => (
                          <div key={change.key} className="heap-object change">
                            <div className="object-name">{change.key}</div>
                            <div className="object-value">
                              {change.before !== undefined ? (
                                <span className="value-change">
                                  <span className="value-before">{stringifyValue(change.before)}</span>
                                  <span className="arrow">→</span>
                                  <span className="value-after">{stringifyValue(change.after ?? '—')}</span>
                                </span>
                              ) : (
                                <span className="value-new">{stringifyValue(change.after ?? '—')}</span>
                              )}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>

                  {genericTrace[activeStep]?.op && (
                    <div className="operation-section">
                      <div className="section-title">{t('operation')}</div>
                      <div className="op-row">
                        <span className="op-chip">{genericTrace[activeStep].op?.left}</span>
                        <span className="op-chip">{genericTrace[activeStep].op?.operator}</span>
                        <span className="op-chip">{genericTrace[activeStep].op?.right}</span>
                        <span className="op-chip">=</span>
                        <span className="op-chip">{genericTrace[activeStep].op?.result}</span>
                        <span className="op-chip">{genericTrace[activeStep].op?.target}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="output-section">
                  <div className="section-title">{t('output')}</div>
                  <div className="output-content">
                    <pre>
                      {detected.runnable === 'js'
                        ? jsResult?.logs?.length
                          ? jsResult.logs.join('\n')
                          : t('noOutput')
                        : genericTrace[activeStep]?.outputsAfter?.length
                        ? genericTrace[activeStep].outputsAfter.join('\n')
                        : t('noOutput')}
                      {detected.runnable === 'js' && jsResult?.error ? `\n${jsResult.error}` : ''}
                      {detected.runnable === 'js' && jsResult?.timedOut ? `\n${t('timedOut')}` : ''}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className={aiOpen ? 'ai-drawer open' : 'ai-drawer'}>
        <div className="ai-drawer-head">
          <h2>{t('aiTitle')}</h2>
          <button className="btn" onClick={() => setAiOpen(false)}>
            {t('aiClose')}
          </button>
        </div>
        <p className="ai-desc">{t('aiDesc')}</p>
        <label className="field">
          <span>{t('aiPrompt')}</span>
          <textarea
            className="ai-input"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder={t('aiPromptPlaceholder')}
          />
        </label>
        <div className="field">
          <span>{t('aiCode')}</span>
          <textarea
            className="ai-code"
            value={aiCode}
            onChange={(event) => setAiCode(event.target.value)}
          />
        </div>
        <button className="btn primary" onClick={handleAiExplain} disabled={aiStatus === 'loading'}>
          {aiStatus === 'loading' ? t('aiWorking') : t('aiExplain')}
        </button>
        <div className={`ai-answer ${aiStatus === 'error' ? 'warn' : ''}`}>
          {aiAnswer || t('aiEmpty')}
        </div>
      </aside>


      <section className="panel panel-footer">
        <div>
          <h2>{t('testCodesTitle')}</h2>
          <div className="test-codes">
            <button className="btn" onClick={() => setCode(DEFAULT_CODE)}>
              {t('testPython')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_JAVA)}>
              {t('testJava')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_TS)}>
              {t('testTs')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_C)}>
              {t('testC')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_CPP)}>
              {t('testCpp')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_CS)}>
              {t('testCs')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_GO)}>
              {t('testGo')}
            </button>
            <button className="btn" onClick={() => setCode(DEFAULT_RUST)}>
              {t('testRust')}
            </button>
          </div>
        </div>
        <div>
          <h2>{t('principlesTitle')}</h2>
          <ul>
            <li>{t('principle1')}</li>
            <li>{t('principle2')}</li>
            <li>{t('principle3')}</li>
          </ul>
        </div>
        <div>
          <h2>{t('docsTitle')}</h2>
          <ul>
            <li>{t('docs1')}</li>
            <li>{t('docs2')}</li>
            <li>{t('docs3')}</li>
            <li>{t('docs4')}</li>
          </ul>
        </div>
      </section>

      <footer className="footer">
        <div className="credit">{t('designedBy', { year })}</div>
      </footer>
    </div>
  )
}

function buildLocalExplanation(code: string, locale: 'es' | 'en') {
  const lines = code.split('\n').filter((line) => line.trim().length > 0)
  const length = lines.length
  const hasLoops = lines.some((line) => /loop|for|while/i.test(line))
  const hasConditionals = lines.some((line) => /if|switch|case/i.test(line))
  const hint = locale === 'es'
    ? 'Este es un resumen local. Conecta un proveedor IA real para obtener análisis profundo.'
    : 'This is a local summary. Connect a real AI provider for deeper analysis.'
  return [
    locale === 'es'
      ? `Detecté ${length} líneas activas.`
      : `Detected ${length} active lines.`,
    hasLoops
      ? locale === 'es'
        ? 'Hay bucles en el flujo.'
        : 'There are loops in the flow.'
      : locale === 'es'
        ? 'No veo bucles explícitos.'
        : 'No explicit loops found.',
    hasConditionals
      ? locale === 'es'
        ? 'Hay condiciones que afectan la ejecución.'
        : 'There are conditions affecting execution.'
      : locale === 'es'
        ? 'No veo condiciones explícitas.'
        : 'No explicit conditions found.',
    hint,
  ].join(' ')
}

function normalizeAiAnswer(
  answer: string,
  prompt: string,
  code: string,
  languageId: string,
  locale: 'es' | 'en'
) {
  const trimmed = answer.trim()
  const incomplete = isPossiblyIncomplete(code, languageId)
  if (!trimmed) {
    return buildAiFallbackAnswer(prompt, code, languageId, locale, incomplete)
  }
  if (incomplete && !/incomplet|incomplete|faltan|missing/i.test(trimmed)) {
    return injectIncompleteNotice(trimmed, locale)
  }
  return trimmed
}

function injectIncompleteNotice(answer: string, locale: 'es' | 'en') {
  const note =
    locale === 'es'
      ? 'Nota: el código parece incompleto.'
      : 'Note: the code appears incomplete.'
  return `${note}\n\n${answer}`
}

function buildAiFallbackAnswer(
  prompt: string,
  code: string,
  languageId: string,
  locale: 'es' | 'en',
  incomplete: boolean
) {
  const question = prompt.trim() || (locale === 'es' ? 'Sin pregunta' : 'No question')
  const summary = buildLocalExplanation(code, locale)
  const steps = buildStepList(code, locale)
  const output = getOutputFromTrace(code, languageId, locale)
  const response = locale === 'es'
    ? `Sobre tu pregunta ("${question}"), el código actual ${incomplete ? 'parece incompleto, así que no se puede responder del todo.' : 'permite una respuesta básica.'}`
    : `About your question ("${question}"), the current code ${incomplete ? 'appears incomplete, so it cannot be fully answered.' : 'allows a basic answer.'}`
  const summaryLine = locale === 'es'
    ? `En resumen, ${summary}`
    : `In short, ${summary}`
  const stepsText = steps.join(' ')
  const outputLine = locale === 'es' ? `Salida: ${output}` : `Output: ${output}`
  return [response, summaryLine, stepsText, outputLine].join('\n\n')
}

function buildStepList(code: string, locale: 'es' | 'en') {
  const lines = code.split('\n').filter((line) => line.trim().length > 0)
  const limited = lines.slice(0, 6)
  return limited.map((line, index) => {
    const trimmed = line.trim()
    return locale === 'es'
      ? `En la línea ${index + 1} se ve: ${trimmed}.`
      : `On line ${index + 1} you can see: ${trimmed}.`
  })
}

function getOutputFromTrace(code: string, languageId: string, locale: 'es' | 'en') {
  try {
    const trace = buildTraceForCode(code, languageId, locale)
    const outputs = trace.length ? trace[trace.length - 1].outputsAfter : []
    if (outputs.length > 0) return outputs.join('\n')
  } catch {
    // ignore
  }
  return locale === 'es' ? 'Sin salida.' : 'No output.'
}

function isPossiblyIncomplete(code: string, languageId: string) {
  const trimmed = code.trim()
  if (!trimmed) return true
  if (languageId === 'python') {
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (line.trim().endsWith(':')) {
        const indent = line.match(/^\s*/)?.[0].length ?? 0
        let found = false
        for (let j = i + 1; j < lines.length; j += 1) {
          if (lines[j].trim().length === 0) continue
          const nextIndent = lines[j].match(/^\s*/)?.[0].length ?? 0
          if (nextIndent > indent) found = true
          break
        }
        if (!found) return true
      }
    }
  }
  if (['java', 'c', 'cpp', 'csharp', 'go', 'rust'].includes(languageId)) {
    let balance = 0
    for (const char of code) {
      if (char === '{') balance += 1
      if (char === '}') balance -= 1
    }
    if (balance !== 0) return true
  }
  return false
}

function detectLanguage(code: string, locale: 'es' | 'en'): DetectedLanguage {
  const sample = code.trim()
  if (!sample) {
    return {
      id: 'empty',
      label: locale === 'es' ? 'Sin código' : 'No code',
      runnable: null,
    }
  }

  const looksJava =
    /\bpublic\s+class\b|\bpublic\s+static\s+void\s+main\b|System\.out\.println/.test(sample)
  if (looksJava) {
    return { id: 'java', label: 'Java', runnable: null }
  }

  const looksCs = /\busing\s+System\b|Console\.Write(Line|)\b/.test(sample)
  if (looksCs) {
    return { id: 'csharp', label: 'C#', runnable: null }
  }

  const looksCpp = /#include\s+<iostream>|std::cout|std::string/.test(sample)
  if (looksCpp) {
    return { id: 'cpp', label: 'C++', runnable: null }
  }

  const looksC = /#include\s+<stdio\.h>|printf\(|scanf\(/.test(sample)
  if (looksC) {
    return { id: 'c', label: 'C', runnable: null }
  }

  const looksGo = /\bpackage\s+main\b|\bfunc\s+main\b|fmt\.Print/.test(sample)
  if (looksGo) {
    return { id: 'go', label: 'Go', runnable: null }
  }

  const looksRust = /\bfn\s+main\b|println!\b|let\s+mut\b/.test(sample)
  if (looksRust) {
    return { id: 'rust', label: 'Rust', runnable: null }
  }

  const looksTs =
    /\binterface\b|\btype\s+\w+\s*=|:\s*(string|number|boolean|any|unknown)\b/.test(sample)
  if (looksTs) {
    return { id: 'typescript', label: 'TypeScript', runnable: null }
  }


  const looksPython = /(def\s|\bimport\s|\bprint\(|\belif\b|\bNone\b|:\s*$)/m.test(sample)
  if (looksPython) {
    return { id: 'python', label: 'Python', runnable: null }
  }

  const looksSql = /\bselect\b|\bfrom\b|\bwhere\b|\binsert\b|\bupdate\b|\bdelete\b/i.test(sample)
  if (looksSql) {
    return { id: 'sql', label: 'SQL', runnable: null }
  }

  return {
    id: 'unknown',
    label: locale === 'es' ? 'Lenguaje desconocido' : 'Unknown language',
    runnable: null,
  }
}

function buildGenericTrace(code: string, locale: 'es' | 'en'): VisualTraceEntry[] {
  const lines = code.split('\n').map((raw) => raw.replace(/\t/g, '  '))
  const trace: VisualTraceEntry[] = []
  const vars = new Map<string, TraceValue>()
  const outputs: string[] = []
  let step = 1

  const parsed = lines
    .map((raw) => {
      const stripped = raw.replace(/#.*$/, '')
      const indent = stripped.match(/^\s*/)?.[0].length ?? 0
      const text = stripped.trim()
      return { raw, text, indent }
    })
    .filter((line) => line.text.length > 0 && !line.text.startsWith('//'))

  const pushTrace = (
    text: string,
    action: string,
    before: Record<string, TraceValue>,
    after: Record<string, TraceValue>,
    outputsBefore: string[],
    outputsAfter: string[],
    op?: VisualTraceEntry['op'],
    outputLine?: string
  ) => {
    trace.push({
      step,
      line: text,
      state: formatState(before),
      note: action,
      action,
      before,
      after,
      outputsBefore,
      outputsAfter,
      outputLine,
      op,
    })
    step += 1
  }

  const executeLine = (text: string) => {
    const before = snapshotMap(vars)
    const outputsBefore = [...outputs]

    const assignOpMatch = text.match(/^([A-Za-z_]\w*)\s*([+\-*/])=\s*(.+)$/)
    if (assignOpMatch) {
      const target = assignOpMatch[1]
      const operator = assignOpMatch[2]
      const rightRaw = assignOpMatch[3].trim()
      const leftValue = resolveNumericValue(vars.get(target))
      const rightValue = resolveNumeric(rightRaw, vars)
      const result = applyOperator(leftValue, rightValue, operator)
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator,
        right: `${rightValue}`,
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Actualiza variable con operador' : 'Updates variable with operator',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const assignMatch = text.match(/^(?:const|let|var)?\s*([A-Za-z_]\w*)\s*=\s*(.+)$/)
    if (assignMatch) {
      const target = assignMatch[1]
      const expr = assignMatch[2].trim()
      const jsList = parseJsArray(expr, vars)
      if (jsList) {
        vars.set(target, jsList)
        pushTrace(
          text,
          locale === 'es' ? 'Asignación de lista' : 'List assignment',
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        return
      }
      const reduceValue = parseJsReduce(expr, vars)
      if (reduceValue !== null) {
        vars.set(target, reduceValue)
        pushTrace(
          text,
          locale === 'es' ? 'Asignación (reduce)' : 'Assignment (reduce)',
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        return
      }
      const listValue = parseList(expr, vars)
      if (listValue) {
        vars.set(target, listValue)
        pushTrace(
          text,
          locale === 'es' ? 'Asignación de lista' : 'List assignment',
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        return
      }

      const operation = parseBinary(expr, vars)
      const result = operation?.result ?? resolveNumeric(expr, vars)
      vars.set(target, result)
      const op = operation ? { ...operation, target } : undefined
      pushTrace(
        text,
        locale === 'es' ? 'Asignación' : 'Assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    if (/^print\b|\bprint\(/.test(text) || /^console\.log/.test(text)) {
      const out = resolvePrint(text, vars)
      outputs.push(out)
      pushTrace(
        text,
        locale === 'es' ? 'Salida' : 'Output',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        undefined,
        out
      )
      return
    }

    pushTrace(
      text,
      locale === 'es' ? 'Ejecución' : 'Execution',
      before,
      snapshotMap(vars),
      outputsBefore,
      [...outputs]
    )
  }

  const runBlock = (start: number, end: number) => {
    let index = start
    while (index < end) {
      const line = parsed[index]
      const currentIndent = line.indent
      const nextIndex = index + 1
      const blockEnd = findBlockEnd(parsed, nextIndex, currentIndent)

      if (line.text.startsWith('if ')) {
        const condition = line.text.replace(/^if\s+/, '').replace(/:\s*$/, '')
        const result = evaluateCondition(condition, vars)
        const before = snapshotMap(vars)
        const outputsBefore = [...outputs]
        pushTrace(
          line.text,
          locale === 'es' ? `Condición: ${result ? 'verdadero' : 'falso'}` : `Condition: ${result ? 'true' : 'false'}`,
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        if (result) {
          runBlock(nextIndex, blockEnd)
          const elseIndex = findElseIndex(parsed, blockEnd, currentIndent)
          if (elseIndex !== -1) {
            const elseBlockEnd = findBlockEnd(parsed, elseIndex + 1, currentIndent)
            index = elseBlockEnd
            continue
          }
        } else {
          const elseIndex = findElseIndex(parsed, blockEnd, currentIndent)
          if (elseIndex !== -1) {
            const elseBlockEnd = findBlockEnd(parsed, elseIndex + 1, currentIndent)
            runBlock(elseIndex + 1, elseBlockEnd)
            index = elseBlockEnd
            continue
          }
        }
        index = blockEnd
        continue
      }

      if (line.text.startsWith('for ')) {
        const forRangeMatch = line.text.match(
          /^for\s+([A-Za-z_]\w*)\s+in\s+range\((.+)\)\s*:\s*$/
        )
        const forListMatch = line.text.match(
          /^for\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_]\w*)\s*:\s*$/
        )

        if (forRangeMatch) {
          const iterator = forRangeMatch[1]
          const countValue = resolveNumeric(forRangeMatch[2].trim(), vars)
          const limit = Math.max(0, Math.floor(countValue))
          const loopBlockEnd = blockEnd
          for (let i = 0; i < limit; i += 1) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            vars.set(iterator, i)
            pushTrace(
              line.text,
              locale === 'es'
                ? `Bucle ${iterator} = ${i} (${i + 1}/${limit})`
                : `Loop ${iterator} = ${i} (${i + 1}/${limit})`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(nextIndex, loopBlockEnd)
          }
          index = loopBlockEnd
          continue
        }

        if (forListMatch) {
          const iterator = forListMatch[1]
          const listName = forListMatch[2]
          const listValue = vars.get(listName)
          const list = Array.isArray(listValue) ? listValue : []
          const loopBlockEnd = blockEnd
          for (let i = 0; i < list.length; i += 1) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            vars.set(iterator, list[i])
            pushTrace(
              line.text,
              locale === 'es'
                ? `Bucle ${iterator} = ${list[i]} (${i + 1}/${list.length})`
                : `Loop ${iterator} = ${list[i]} (${i + 1}/${list.length})`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(nextIndex, loopBlockEnd)
          }
          index = loopBlockEnd
          continue
        }
      }

      executeLine(line.text)
      index += 1
    }
  }

  runBlock(0, parsed.length)

  return trace
}

function buildJavaTrace(code: string, locale: 'es' | 'en'): VisualTraceEntry[] {
  const rawLines = code.split('\n')
  const lines = rawLines
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        !line.startsWith('public class') &&
        !line.startsWith('public static void main')
    )
  const braceStack: number[] = []
  const braceMap = new Map<number, number>()
  lines.forEach((line, index) => {
    for (const char of line) {
      if (char === '{') {
        braceStack.push(index)
      } else if (char === '}') {
        const open = braceStack.pop()
        if (open !== undefined) {
          braceMap.set(open, index)
        }
      }
    }
  })

  const trace: VisualTraceEntry[] = []
  const vars = new Map<string, TraceValue>()
  const outputs: string[] = []
  let step = 1

  const pushTrace = (
    text: string,
    action: string,
    before: Record<string, TraceValue>,
    after: Record<string, TraceValue>,
    outputsBefore: string[],
    outputsAfter: string[],
    op?: VisualTraceEntry['op'],
    outputLine?: string
  ) => {
    trace.push({
      step,
      line: text,
      state: formatState(before),
      note: action,
      action,
      before,
      after,
      outputsBefore,
      outputsAfter,
      outputLine,
      op,
    })
    step += 1
  }

  const executeLine = (text: string) => {
    const before = snapshotMap(vars)
    const outputsBefore = [...outputs]

    // Go-style compound assignment (with or without semicolon)
    const compoundMatch = text.match(/^([A-Za-z_]\w*)\s*([+\-*/])=\s*(.+?);?$/)
    if (compoundMatch) {
      const target = compoundMatch[1]
      const operator = compoundMatch[2]
      const rightValue = resolveNumeric(compoundMatch[3].trim(), vars)
      const leftValue = resolveNumericValue(vars.get(target))
      const result = applyOperator(leftValue, rightValue, operator)
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator,
        right: `${rightValue}`,
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Actualiza variable' : 'Update variable',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const incMatch = text.match(/^([A-Za-z_]\w*)\s*\+\+;$/)
    if (incMatch) {
      const target = incMatch[1]
      const leftValue = resolveNumericValue(vars.get(target))
      const result = leftValue + 1
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator: '+',
        right: '1',
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Incremento' : 'Increment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const decMatch = text.match(/^([A-Za-z_]\w*)\s*--;$/)
    if (decMatch) {
      const target = decMatch[1]
      const leftValue = resolveNumericValue(vars.get(target))
      const result = leftValue - 1
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator: '-',
        right: '1',
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Decremento' : 'Decrement',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    // Java array initialization: int[] nombre = {valores};
    const arrayInitMatch = text.match(/^int\[\]\s+([A-Za-z_]\w*)\s*=\s*\{([^}]+)\};$/)
    if (arrayInitMatch) {
      const target = arrayInitMatch[1]
      const content = arrayInitMatch[2].trim()
      const parts = content.split(',').map((part) => part.trim())
      const values: number[] = []
      for (const part of parts) {
        const numeric = resolveNumeric(part, vars)
        values.push(numeric)
      }
      vars.set(target, values)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración de array' : 'Array declaration',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    const intAssign = text.match(/^int\s+([A-Za-z_]\w*)\s*=\s*(.+);$/)
    if (intAssign) {
      const target = intAssign[1]
      const expr = intAssign[2].trim()
      // Check for array access: numeros[0] or numeros[i]
      const arrayAccessMatch = expr.match(/^([A-Za-z_]\w*)\[([^\]]+)\]$/)
      if (arrayAccessMatch) {
        const arrayName = arrayAccessMatch[1]
        const indexExpr = arrayAccessMatch[2].trim()
        const arrayValue = vars.get(arrayName)
        if (Array.isArray(arrayValue)) {
          const index = resolveNumeric(indexExpr, vars)
          const value = arrayValue[Math.floor(index)] ?? 0
          vars.set(target, value)
          pushTrace(
            text,
            locale === 'es' ? 'Declaración y asignación desde array' : 'Declaration and assignment from array',
            before,
            snapshotMap(vars),
            outputsBefore,
            [...outputs]
          )
          return
        }
      }
      const operation = parseBinary(expr, vars)
      const result = operation?.result ?? resolveNumeric(expr, vars)
      vars.set(target, result)
      const op = operation ? { ...operation, target } : undefined
      pushTrace(
        text,
        locale === 'es' ? 'Declaración y asignación' : 'Declaration and assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const intDecl = text.match(/^int\s+([A-Za-z_]\w*)\s*;$/)
    if (intDecl) {
      vars.set(intDecl[1], 0)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración' : 'Declaration',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    const assign = text.match(/^([A-Za-z_]\w*)\s*=\s*(.+);$/)
    if (assign) {
      const target = assign[1]
      const expr = assign[2].trim()
      // Check for array access: numeros[i]
      const arrayAccessMatch = expr.match(/^([A-Za-z_]\w*)\[([^\]]+)\]$/)
      if (arrayAccessMatch) {
        const arrayName = arrayAccessMatch[1]
        const indexExpr = arrayAccessMatch[2].trim()
        const arrayValue = vars.get(arrayName)
        if (Array.isArray(arrayValue)) {
          const index = resolveNumeric(indexExpr, vars)
          const value = arrayValue[Math.floor(index)] ?? 0
          vars.set(target, value)
          pushTrace(
            text,
            locale === 'es' ? 'Asignación desde array' : 'Assignment from array',
            before,
            snapshotMap(vars),
            outputsBefore,
            [...outputs]
          )
          return
        }
      }
      const operation = parseBinary(expr, vars)
      const result = operation?.result ?? resolveNumeric(expr, vars)
      vars.set(target, result)
      const op = operation ? { ...operation, target } : undefined
      pushTrace(
        text,
        locale === 'es' ? 'Asignación' : 'Assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const println = text.match(/^System\.out\.println\((.*)\);$/)
    if (println) {
      const out = renderJavaPrint(println[1], vars)
      outputs.push(out)
      pushTrace(
        text,
        locale === 'es' ? 'Salida' : 'Output',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        undefined,
        out
      )
      return
    }

    pushTrace(text, locale === 'es' ? 'Ejecución' : 'Execution', before, snapshotMap(vars), outputsBefore, [...outputs])
  }

  const findElseBlock = (ifEndIndex: number) => {
    let elseLineIndex = -1
    const sameLine = lines[ifEndIndex] ?? ''
    if (sameLine.includes('else')) {
      elseLineIndex = ifEndIndex
    } else if ((lines[ifEndIndex + 1] ?? '').startsWith('else')) {
      elseLineIndex = ifEndIndex + 1
    }
    if (elseLineIndex === -1) return null
    const elseEnd = braceMap.get(elseLineIndex)
    if (elseEnd === undefined) return null
    return { start: elseLineIndex + 1, end: elseEnd }
  }

  const runBlock = (start: number, end: number) => {
    let index = start
    while (index < end) {
      const line = lines[index]
      if (line === '{' || line === '}' || line === '};') {
        index += 1
        continue
      }

      if (line.startsWith('if ')) {
        const condition = line.replace(/^if\s*\(/, '').replace(/\)\s*\{?$/, '')
        // Resolve array access in condition (e.g., numeros[i] > maximo)
        const resolvedCondition = condition.replace(/([A-Za-z_]\w*)\[([^\]]+)\]/g, (_match, arrayName, indexExpr) => {
          const arrayValue = vars.get(arrayName)
          if (Array.isArray(arrayValue)) {
            const index = resolveNumeric(indexExpr.trim(), vars)
            const value = arrayValue[Math.floor(index)] ?? 0
            return String(value)
          }
          return _match
        })
        const result = evaluateCondition(resolvedCondition, vars)
        const before = snapshotMap(vars)
        const outputsBefore = [...outputs]
        pushTrace(
          line,
          locale === 'es' ? `Condición: ${result ? 'verdadero' : 'falso'}` : `Condition: ${result ? 'true' : 'false'}`,
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        const blockEnd = braceMap.get(index) ?? index
        if (result) {
          runBlock(index + 1, blockEnd)
          const elseBlock = findElseBlock(blockEnd)
          if (elseBlock) {
            index = elseBlock.end + 1
            continue
          }
        } else {
          const elseBlock = findElseBlock(blockEnd)
          if (elseBlock) {
            runBlock(elseBlock.start, elseBlock.end)
            index = elseBlock.end + 1
            continue
          }
        }
        index = blockEnd + 1
        continue
      }

      if (line.startsWith('for ')) {
        const forMatch = line.match(
          /^for\s*\(\s*int\s+([A-Za-z_]\w*)\s*=\s*(.+?);\s*\1\s*([<>=!]+)\s*(.+?);\s*\1\+\+\s*\)\s*\{?$/
        )
        const blockEnd = braceMap.get(index) ?? index
        if (forMatch) {
          const iterator = forMatch[1]
          const startValue = resolveNumeric(forMatch[2].trim(), vars)
          const op = forMatch[3]
          const limitExpr = forMatch[4].trim()
          // Resolve limit expression (could be array.length or number)
          const limitValue = resolveNumeric(limitExpr, vars)
          let i = startValue
          while (compare(i, limitValue, op)) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            vars.set(iterator, i)
            pushTrace(
              line,
              locale === 'es'
                ? `Bucle ${iterator} = ${i}`
                : `Loop ${iterator} = ${i}`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(index + 1, blockEnd)
            i += 1
          }
          index = blockEnd + 1
          continue
        }
      }

      executeLine(line)
      index += 1
    }
  }

  runBlock(0, lines.length)
  return trace
}

function buildCStyleTrace(code: string, locale: 'es' | 'en'): VisualTraceEntry[] {
  const rawLines = code.split('\n')
  const lines = rawLines
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0)
    .filter((line) => 
      !line.startsWith('package ') &&
      !line.startsWith('import ') &&
      !line.startsWith('func main()') &&
      !line.startsWith('fn main()')
    )

  const braceStack: number[] = []
  const braceMap = new Map<number, number>()
  lines.forEach((line, index) => {
    for (const char of line) {
      if (char === '{') {
        braceStack.push(index)
      } else if (char === '}') {
        const open = braceStack.pop()
        if (open !== undefined) {
          braceMap.set(open, index)
        }
      }
    }
  })

  const trace: VisualTraceEntry[] = []
  const vars = new Map<string, TraceValue>()
  const outputs: string[] = []
  let step = 1

  const pushTrace = (
    text: string,
    action: string,
    before: Record<string, TraceValue>,
    after: Record<string, TraceValue>,
    outputsBefore: string[],
    outputsAfter: string[],
    op?: VisualTraceEntry['op'],
    outputLine?: string
  ) => {
    trace.push({
      step,
      line: text,
      state: formatState(before),
      note: action,
      action,
      before,
      after,
      outputsBefore,
      outputsAfter,
      outputLine,
      op,
    })
    step += 1
  }

  const executeLine = (text: string) => {
    const before = snapshotMap(vars)
    const outputsBefore = [...outputs]

    // Go-style compound assignment (with or without semicolon)
    const compoundMatch = text.match(/^([A-Za-z_]\w*)\s*([+\-*/])=\s*(.+?);?$/)
    if (compoundMatch) {
      const target = compoundMatch[1]
      const operator = compoundMatch[2]
      const rightValue = resolveNumeric(compoundMatch[3].trim(), vars)
      const leftValue = resolveNumericValue(vars.get(target))
      const result = applyOperator(leftValue, rightValue, operator)
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator,
        right: `${rightValue}`,
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Actualiza variable' : 'Update variable',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const incMatch = text.match(/^([A-Za-z_]\w*)\s*\+\+;$/)
    if (incMatch) {
      const target = incMatch[1]
      const leftValue = resolveNumericValue(vars.get(target))
      const result = leftValue + 1
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator: '+',
        right: '1',
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Incremento' : 'Increment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const decMatch = text.match(/^([A-Za-z_]\w*)\s*--;$/)
    if (decMatch) {
      const target = decMatch[1]
      const leftValue = resolveNumericValue(vars.get(target))
      const result = leftValue - 1
      vars.set(target, result)
      const op = {
        left: `${leftValue}`,
        operator: '-',
        right: '1',
        result,
        target,
      }
      pushTrace(
        text,
        locale === 'es' ? 'Decremento' : 'Decrement',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    // Go-style declaration with := (short variable declaration)
    const goDeclMatch = text.match(/^([A-Za-z_]\w*)\s*:=\s*(.+?);?$/)
    if (goDeclMatch) {
      const target = goDeclMatch[1]
      const expr = goDeclMatch[2].trim()
      const sliceMatch = expr.match(/^\[\]\w+\s*\{(.*)\}$/)
      if (sliceMatch) {
        const list = parseNumericList(sliceMatch[1].trim(), vars)
        vars.set(target, list)
        pushTrace(
          text,
          locale === 'es' ? 'Declaración de lista' : 'List declaration',
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        return
      }
      const result = resolveNumeric(expr, vars)
      vars.set(target, result)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración y asignación' : 'Declaration and assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    // Rust-style declaration: let mut var = value;
    const rustDeclMatch = text.match(/^let\s+(?:mut\s+)?([A-Za-z_]\w*)\s*=\s*(.+?);$/)
    if (rustDeclMatch) {
      const target = rustDeclMatch[1]
      const expr = rustDeclMatch[2].trim()
      const vecMatch = expr.match(/^vec!\[(.*)\]$/)
      if (vecMatch) {
        const list = parseNumericList(vecMatch[1].trim(), vars)
        vars.set(target, list)
        pushTrace(
          text,
          locale === 'es' ? 'Declaración de vector' : 'Vector declaration',
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        return
      }
      const result = resolveNumeric(expr, vars)
      vars.set(target, result)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración y asignación' : 'Declaration and assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    // C/C#/C++ array initialization: int[] name = {1, 2}; or int name[] = {1, 2};
    const arrayInitMatch = text.match(
      /^(?:int|long|float|double)\s*(?:\[\])?\s+([A-Za-z_]\w*)(?:\[\])?\s*=\s*\{([^}]+)\};$/
    )
    if (arrayInitMatch) {
      const target = arrayInitMatch[1]
      const list = parseNumericList(arrayInitMatch[2].trim(), vars)
      vars.set(target, list)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración de array' : 'Array declaration',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    const declAssign = text.match(/^(?:int|long|float|double|var|let|auto)\s+([A-Za-z_]\w*)\s*=\s*(.+);$/)
    if (declAssign) {
      const target = declAssign[1]
      const expr = declAssign[2].trim()
      const arrayAccessMatch = expr.match(/^([A-Za-z_]\w*)\[([^\]]+)\]$/)
      if (arrayAccessMatch) {
        const arrayValue = vars.get(arrayAccessMatch[1])
        if (Array.isArray(arrayValue)) {
          const index = resolveNumeric(arrayAccessMatch[2].trim(), vars)
          const value = arrayValue[Math.floor(index)] ?? 0
          vars.set(target, value)
          pushTrace(
            text,
            locale === 'es' ? 'Declaración y asignación desde array' : 'Declaration and assignment from array',
            before,
            snapshotMap(vars),
            outputsBefore,
            [...outputs]
          )
          return
        }
      }
      const result = resolveNumeric(expr, vars)
      vars.set(target, result)
      pushTrace(
        text,
        locale === 'es' ? 'Declaración y asignación' : 'Declaration and assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs]
      )
      return
    }

    const assign = text.match(/^([A-Za-z_]\w*)\s*=\s*(.+?);?$/)
    if (assign) {
      const target = assign[1]
      const expr = assign[2].trim()
      const arrayAccessMatch = expr.match(/^([A-Za-z_]\w*)\[([^\]]+)\]$/)
      if (arrayAccessMatch) {
        const arrayValue = vars.get(arrayAccessMatch[1])
        if (Array.isArray(arrayValue)) {
          const index = resolveNumeric(arrayAccessMatch[2].trim(), vars)
          const value = arrayValue[Math.floor(index)] ?? 0
          vars.set(target, value)
          pushTrace(
            text,
            locale === 'es' ? 'Asignación desde array' : 'Assignment from array',
            before,
            snapshotMap(vars),
            outputsBefore,
            [...outputs]
          )
          return
        }
      }
      const operation = parseBinary(expr, vars)
      const result = operation?.result ?? resolveNumeric(expr, vars)
      vars.set(target, result)
      const op = operation ? { ...operation, target } : undefined
      pushTrace(
        text,
        locale === 'es' ? 'Asignación' : 'Assignment',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        op
      )
      return
    }

    const out = renderCStylePrint(text, vars)
    if (out) {
      outputs.push(out)
      pushTrace(
        text,
        locale === 'es' ? 'Salida' : 'Output',
        before,
        snapshotMap(vars),
        outputsBefore,
        [...outputs],
        undefined,
        out
      )
      return
    }

    pushTrace(text, locale === 'es' ? 'Ejecución' : 'Execution', before, snapshotMap(vars), outputsBefore, [...outputs])
  }

  const findElseBlock = (ifEndIndex: number) => {
    let elseLineIndex = -1
    const sameLine = lines[ifEndIndex] ?? ''
    if (sameLine.includes('else')) {
      elseLineIndex = ifEndIndex
    } else if ((lines[ifEndIndex + 1] ?? '').startsWith('else')) {
      elseLineIndex = ifEndIndex + 1
    }
    if (elseLineIndex === -1) return null
    const elseEnd = braceMap.get(elseLineIndex)
    if (elseEnd === undefined) return null
    return { start: elseLineIndex + 1, end: elseEnd }
  }

  const runBlock = (start: number, end: number) => {
    let index = start
    while (index < end) {
      const line = lines[index]
      if (line === '{' || line === '}' || line === '};') {
        executeLine(line)
        index += 1
        continue
      }

      if (line.startsWith('if ')) {
        const condition = line.replace(/^if\s*\(/, '').replace(/\)\s*\{?$/, '')
        const result = evaluateCondition(condition, vars)
        const before = snapshotMap(vars)
        const outputsBefore = [...outputs]
        pushTrace(
          line,
          locale === 'es' ? `Condición: ${result ? 'verdadero' : 'falso'}` : `Condition: ${result ? 'true' : 'false'}`,
          before,
          snapshotMap(vars),
          outputsBefore,
          [...outputs]
        )
        const blockEnd = braceMap.get(index) ?? index
        if (result) {
          runBlock(index + 1, blockEnd)
          const elseBlock = findElseBlock(blockEnd)
          if (elseBlock) {
            index = elseBlock.end + 1
            continue
          }
        } else {
          const elseBlock = findElseBlock(blockEnd)
          if (elseBlock) {
            runBlock(elseBlock.start, elseBlock.end)
            index = elseBlock.end + 1
            continue
          }
        }
        index = blockEnd + 1
        continue
      }

      if (line.startsWith('for ')) {
        // C-style for loop: for(init; cond; update)
        const forMatch = line.match(/^for\s*\((.+);(.+);(.+)\)\s*\{?$/)
        const blockEnd = braceMap.get(index) ?? index
        if (forMatch) {
          const init = forMatch[1].trim()
          const cond = forMatch[2].trim()
          const update = forMatch[3].trim()
          if (init) executeLine(`${init};`)
          let guard = 0
          while (guard < 100 && evaluateCondition(cond, vars)) {
            runBlock(index + 1, blockEnd)
            executeLine(`${update};`)
            guard += 1
          }
          index = blockEnd + 1
          continue
        }
        
        // Go-style for loop: for i := 1; i <= 3; i++
        const goForMatch = line.match(/^for\s+([A-Za-z_]\w*)\s*:=\s*(.+?);\s*(.+?);\s*(.+?)\s*\{?$/)
        if (goForMatch) {
          const iterator = goForMatch[1]
          const startValue = resolveNumeric(goForMatch[2].trim(), vars)
          const condition = goForMatch[3].trim()
          const update = goForMatch[4].trim()
          vars.set(iterator, startValue)
          let guard = 0
          while (guard < 100 && evaluateCondition(condition, vars)) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            pushTrace(
              line,
              locale === 'es' ? `Bucle ${iterator} = ${vars.get(iterator)}` : `Loop ${iterator} = ${vars.get(iterator)}`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(index + 1, blockEnd)
            if (update.includes('++')) {
              const current = resolveNumericValue(vars.get(iterator))
              vars.set(iterator, current + 1)
            } else if (update.includes('--')) {
              const current = resolveNumericValue(vars.get(iterator))
              vars.set(iterator, current - 1)
            } else {
              executeLine(`${update};`)
            }
            guard += 1
          }
          index = blockEnd + 1
          continue
        }
        
        // Rust-style for loop: for i in 1..=3
        const rustForMatch = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(\d+)\.\.=(\d+)\s*\{?$/)
        if (rustForMatch) {
          const iterator = rustForMatch[1]
          const startValue = resolveNumeric(rustForMatch[2].trim(), vars)
          const endValue = resolveNumeric(rustForMatch[3].trim(), vars)
          const blockEnd = braceMap.get(index) ?? index
          for (let i = startValue; i <= endValue; i++) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            vars.set(iterator, i)
            pushTrace(
              line,
              locale === 'es' ? `Bucle ${iterator} = ${i} (${i - startValue + 1}/${endValue - startValue + 1})` : `Loop ${iterator} = ${i} (${i - startValue + 1}/${endValue - startValue + 1})`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(index + 1, blockEnd)
          }
          index = blockEnd + 1
          continue
        }

        // Rust-style for loop: for x in numeros
        const rustListMatch = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_]\w*)\s*\{?$/)
        if (rustListMatch) {
          const iterator = rustListMatch[1]
          const listName = rustListMatch[2]
          const listValue = vars.get(listName)
          const list = Array.isArray(listValue) ? listValue : []
          const blockEnd = braceMap.get(index) ?? index
          for (let i = 0; i < list.length; i += 1) {
            const before = snapshotMap(vars)
            const outputsBefore = [...outputs]
            vars.set(iterator, resolveNumericValue(list[i]))
            pushTrace(
              line,
              locale === 'es'
                ? `Bucle ${iterator} = ${list[i]} (${i + 1}/${list.length})`
                : `Loop ${iterator} = ${list[i]} (${i + 1}/${list.length})`,
              before,
              snapshotMap(vars),
              outputsBefore,
              [...outputs]
            )
            runBlock(index + 1, blockEnd)
          }
          index = blockEnd + 1
          continue
        }
      }

      executeLine(line)
      index += 1
    }
  }

  runBlock(0, lines.length)
  return trace
}

function resolveNumeric(value: string, vars: Map<string, TraceValue>): number {
  const asNumber = Number(value)
  if (!Number.isNaN(asNumber)) return asNumber

  const lengthMatch = value.match(/^([A-Za-z_]\w*)\.(length|Length)$/)
  if (lengthMatch) {
    const arrayValue = vars.get(lengthMatch[1])
    if (Array.isArray(arrayValue)) {
      return arrayValue.length
    }
  }

  const lenMatch = value.match(/^len\((.+)\)$/)
  if (lenMatch) {
    const arrayValue = vars.get(lenMatch[1].trim())
    if (Array.isArray(arrayValue)) {
      return arrayValue.length
    }
  }

  const arrayAccessMatch = value.match(/^([A-Za-z_]\w*)\[([^\]]+)\]$/)
  if (arrayAccessMatch) {
    const arrayValue = vars.get(arrayAccessMatch[1])
    if (Array.isArray(arrayValue)) {
      const resolvedIndex = resolveNumeric(arrayAccessMatch[2].trim(), vars)
      return arrayValue[Math.floor(resolvedIndex)] ?? 0
    }
  }

  return resolveNumericValue(vars.get(value))
}

function parseBinary(expr: string, vars: Map<string, TraceValue>) {
  const match = expr.match(/^(.+)\s*([+\-*/])\s*(.+)$/)
  if (!match) return null
  const leftRaw = match[1].trim()
  const operator = match[2]
  const rightRaw = match[3].trim()
  const leftValue = resolveNumeric(leftRaw, vars)
  const rightValue = resolveNumeric(rightRaw, vars)
  const result = applyOperator(leftValue, rightValue, operator)
  return {
    left: `${leftValue}`,
    operator,
    right: `${rightValue}`,
    result,
  }
}

function applyOperator(left: number, right: number, operator: string) {
  if (operator === '+') return left + right
  if (operator === '-') return left - right
  if (operator === '*') return left * right
  if (operator === '/') return right === 0 ? left : left / right
  return left
}

function snapshotMap(vars: Map<string, TraceValue>) {
  const result: Record<string, TraceValue> = {}
  for (const [key, value] of vars.entries()) {
    result[key] = value
  }
  return result
}

function formatState(state: Record<string, TraceValue>) {
  const keys = Object.keys(state)
  if (keys.length === 0) return '{}'
  return `{ ${keys.map((key) => `${key}: ${stringifyValue(state[key])}`).join(', ')} }`
}

function resolveNumericValue(value: TraceValue | undefined) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const asNumber = Number(value)
    return Number.isNaN(asNumber) ? 0 : asNumber
  }
  return 0
}

function renderJavaPrint(expr: string, vars: Map<string, TraceValue>) {
  const parts = splitPlus(expr)
  return parts.map((part) => renderValue(part.trim(), vars)).join('')
}

function renderCStylePrint(text: string, vars: Map<string, TraceValue>) {
  const cPrintf = text.match(/^printf\((.*)\);$/)
  if (cPrintf) {
    return renderPrintf(cPrintf[1], vars)
  }
  const csharp = text.match(/^Console\.Write(Line|)\((.*)\);$/)
  if (csharp) {
    return renderConcatArgs(csharp[2], vars)
  }
  const cpp = text.match(/^std::cout\s*<<\s*(.+);$/)
  if (cpp) {
    return renderStream(cpp[1], vars)
  }
  const go = text.match(/^fmt\.Print(ln|f)?\((.*?)\);?$/)
  if (go) {
    if (go[1] === 'f') {
      return renderPrintf(go[2], vars)
    }
    return renderConcatArgs(go[2], vars)
  }
  const rust = text.match(/^println!\((.*)\);$/)
  if (rust) {
    return renderPrintf(rust[1], vars)
  }
  return ''
}

function renderPrintf(args: string, vars: Map<string, TraceValue>) {
  const parts = splitArgs(args)
  if (parts.length === 0) return ''
  const format = renderValue(parts[0], vars)
  if (!format.includes('%')) {
    return [format, ...parts.slice(1).map((part) => renderValue(part, vars))].join(' ').trim()
  }
  let output = format
  for (let i = 1; i < parts.length; i += 1) {
    output = output.replace(/%[dsf]/, renderValue(parts[i], vars))
  }
  return output.replace(/\\n/g, '').trim()
}

function renderConcatArgs(args: string, vars: Map<string, TraceValue>) {
  const parts = splitArgs(args)
  return parts.map((part) => renderConcatArg(part, vars)).join(' ').trim()
}

function renderConcatArg(expr: string, vars: Map<string, TraceValue>) {
  const trimmed = expr.trim()
  if (trimmed.includes('+')) {
    const parts = splitPlus(trimmed)
    if (parts.length > 1) {
      return parts.map((part) => renderValue(part, vars)).join('')
    }
  }
  return renderValue(trimmed, vars)
}

function renderStream(expr: string, vars: Map<string, TraceValue>) {
  const parts = expr.split('<<').map((part) => part.trim())
  const filtered = parts.filter((part) => part !== 'std::endl')
  return filtered.map((part) => renderValue(part, vars)).join(' ').trim()
}

function splitPlus(input: string) {
  const parts: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char === "'" && !inDouble) {
      inSingle = !inSingle
      current += char
      continue
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble
      current += char
      continue
    }
    if (char === '+' && !inSingle && !inDouble) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim().length > 0) {
    parts.push(current.trim())
  }
  return parts
}

function compare(left: number, right: number, op: string) {
  if (op === '<') return left < right
  if (op === '<=') return left <= right
  if (op === '>') return left > right
  if (op === '>=') return left >= right
  if (op === '==') return left === right
  if (op === '!=') return left !== right
  return false
}

function buildTraceForCode(code: string, languageId: string, locale: 'es' | 'en') {
  if (languageId === 'java') {
    return buildJavaTrace(code, locale).slice(0, MAX_STEPS)
  }
  if (['c', 'cpp', 'csharp', 'go', 'rust'].includes(languageId)) {
    return buildCStyleTrace(code, locale).slice(0, MAX_STEPS)
  }
  if (languageId === 'typescript') {
    return buildGenericTrace(code, locale).slice(0, MAX_STEPS)
  }
  return buildGenericTrace(code, locale).slice(0, MAX_STEPS)
}

function parseNumericList(content: string, vars: Map<string, TraceValue>) {
  if (!content) return []
  const parts = content.split(',').map((part) => part.trim())
  const values: number[] = []
  for (const part of parts) {
    const numeric = resolveNumeric(part, vars)
    values.push(numeric)
  }
  return values
}

function parseList(expr: string, vars: Map<string, TraceValue>) {
  const match = expr.match(/^\[(.*)\]$/)
  if (!match) return null
  const content = match[1].trim()
  return parseNumericList(content, vars)
}

function stringifyValue(value: TraceValue) {
  if (Array.isArray(value)) {
    // Para arrays, mostrar de forma compacta pero legible
    if (value.length <= 8) {
      return `[${value.join(', ')}]`
    } else {
      // Para arrays largos, mostrar primeros y últimos elementos
      const first = value.slice(0, 3).join(', ')
      const last = value.slice(-2).join(', ')
      return `[${first}, ..., ${last}] (${value.length} items)`
    }
  }
  return `${value}`
}

function resolvePrint(text: string, vars: Map<string, TraceValue>) {
  const match = text.match(/print\((.*)\)/) || text.match(/console\.log\((.*)\)/)
  if (!match) return ''
  const raw = match[1].trim()
  
  // Check if it's an f-string: f"..." or f'...'
  const fStringMatch = raw.match(/^f["'](.*)["']$/)
  if (fStringMatch) {
    // Process f-string: replace {expr} with values
    let fStringContent = fStringMatch[1]
    // Replace {variable} with actual values
    fStringContent = fStringContent.replace(/\{([^}]+)\}/g, (_match, expr) => {
      const trimmed = expr.trim()
      const value = vars.get(trimmed)
      if (value !== undefined) {
        return stringifyValue(value)
      }
      const numeric = resolveNumeric(trimmed, vars)
      return Number.isNaN(numeric) ? trimmed : `${numeric}`
    })
    return fStringContent
  }
  
  const args = splitArgs(raw)
  const rendered = args.map((arg) => renderValue(arg, vars)).filter((value) => value.length > 0)
  return rendered.join(' ')
}

function splitArgs(input: string) {
  const args: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char === "'" && !inDouble) {
      inSingle = !inSingle
      current += char
      continue
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble
      current += char
      continue
    }
    if (char === ',' && !inSingle && !inDouble) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim().length > 0) {
    args.push(current.trim())
  }
  return args
}

function renderValue(expr: string, vars: Map<string, TraceValue>) {
  const asString = expr.match(/^["'](.*)["']$/)
  if (asString) return asString[1]
  const listValue = parseList(expr, vars)
  if (listValue) return `[${listValue.join(', ')}]`
  const value = vars.get(expr)
  if (value !== undefined) return stringifyValue(value)
  const numeric = resolveNumeric(expr, vars)
  return Number.isNaN(numeric) ? expr : `${numeric}`
}

function parseJsArray(expr: string, vars: Map<string, TraceValue>) {
  const match = expr.match(/^\[(.*)\]$/)
  if (!match) return null
  const content = match[1].trim()
  return parseNumericList(content, vars)
}

function parseJsReduce(expr: string, vars: Map<string, TraceValue>) {
  const match = expr.match(/^([A-Za-z_]\w*)\.reduce\(.+,\s*([^)]+)\)$/)
  if (!match) return null
  const listName = match[1]
  const listValue = vars.get(listName)
  const initialValue = resolveNumeric(match[2].trim(), vars)
  const list = Array.isArray(listValue) ? listValue : []
  let acc = initialValue
  for (const item of list) {
    acc += resolveNumericValue(item)
  }
  return acc
}

function evaluateCondition(condition: string, vars: Map<string, TraceValue>) {
  const match = condition.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (!match) return false
  const left = resolveNumeric(match[1].trim(), vars)
  const right = resolveNumeric(match[3].trim(), vars)
  switch (match[2]) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    default:
      return false
  }
}

function findBlockEnd(lines: { indent: number }[], start: number, parentIndent: number) {
  let index = start
  while (index < lines.length) {
    if (lines[index].indent <= parentIndent) break
    index += 1
  }
  return index
}

function findElseIndex(lines: { text: string; indent: number }[], start: number, parentIndent: number) {
  if (start >= lines.length) return -1
  const candidate = lines[start]
  if (candidate && candidate.indent === parentIndent && candidate.text.startsWith('else')) {
    return start
  }
  return -1
}

function findMatchingLineIndex(code: string, traceLine: string): number | null {
  const codeLines = code.split('\n')
  const normalizedTraceLine = traceLine.trim()
  
  // Buscar la línea que mejor coincida con la línea del trace
  for (let i = 0; i < codeLines.length; i++) {
    const normalizedCodeLine = codeLines[i].trim()
    // Coincidencia exacta
    if (normalizedCodeLine === normalizedTraceLine) {
      return i
    }
    // Coincidencia parcial (la línea del código contiene la del trace o viceversa)
    if (normalizedCodeLine && normalizedTraceLine && 
        (normalizedCodeLine.includes(normalizedTraceLine) || normalizedTraceLine.includes(normalizedCodeLine))) {
      return i
    }
  }
  
  return null
}
