// Lightweight i18n for Miniko UI strings.
import { useCallback, useEffect, useMemo, useState } from 'react'

export type Locale = 'es' | 'en'

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  es: {
    title: 'Plataforma Miniko',
    subtitle: 'Miniko es un visualizador educativo que muestra la ejecución paso a paso con estado y salida, ideal para aprender.',
    pill: '',
    blocksTitle: 'Bloques de código',
    supportedLabel: 'Lenguajes soportados',
    blocksDesc: 'Pega código en Python, Java, TypeScript o Rust y Miniko lo detecta automáticamente.',
    designedBy: 'Diseñado por Mariana-CodeBase · © {year}',
    detected: 'Detectado',
    testCodesTitle: 'Códigos de prueba',
    testPython: 'Python',
    testJava: 'Java',
    testTs: 'TypeScript',
    testRust: 'Rust',
    selfTestTitle: 'Autotests',
    selfTestEmpty: 'Sin resultados.',
    selfTestOk: 'OK',
    selfTestFail: 'Fallo',
    selfTestExpected: 'Esperado: {value}',
    selfTestActual: 'Actual: {value}',
    logicTitle: 'Lógica de ejecución',
    logicDesc: 'Avanza y retrocede paso a paso para entender el flujo.',
    output: 'Salida',
    noOutput: 'Sin salida todavía.',
    trace: 'Traza',
    noTrace: 'No hay pasos para mostrar. Usa Python, Java, TypeScript o Rust.',
    step: 'Paso',
    line: 'Línea',
    state: 'Estado',
    note: 'Nota',
    changes: 'Cambios',
    operation: 'Operación',
    noOperation: 'Sin operación',
    outputLine: 'Salida en este paso',
    stepBack: 'Atrás',
    stepForward: 'Siguiente',
    stepsLimitTitle: 'Límite de pasos alcanzado ({limit})',
    stepsLimitDesc: 'Reduce el tamaño del ejemplo para ver la ejecución completa.',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    language: 'Idioma',
    theme: 'Tema',
    principlesTitle: 'Principios Miniko',
    principle1: 'Didáctico: cada paso muestra cambios claros.',
    principle2: 'Predecible: interpreta un subconjunto estable.',
    principle3: 'Enfocado: solo Python, Java, TypeScript y Rust.',
    docsTitle: 'Guía rápida',
    docs1: 'Pega un ejemplo corto y revisa el paso a paso.',
    docs2: 'Si no avanza, reduce el código o simplifica el bucle.',
    docs3: 'Verifica los resultados en el panel de Autotests.',
    docs4: 'Si algo falla, comparte el snippet y el lenguaje detectado.',
    selfTestDesc: 'Compara la salida esperada con la salida real para validar el intérprete.',
    safetyNote: 'Se interpreta localmente con límites de pasos.',
    code: 'Código',
    frames: 'Frames',
    noVariables: 'Sin variables',
    noChanges: 'Sin cambios en este paso',
  },
  en: {
    title: 'Miniko Platform',
    subtitle: 'Miniko is an educational visualizer that shows step-by-step execution with state and output, ideal for learning.',
    pill: '',
    blocksTitle: 'Code blocks',
    supportedLabel: 'Supported languages',
    blocksDesc: 'Paste Python, Java, TypeScript, or Rust and Miniko detects it automatically.',
    designedBy: 'Designed by Mariana-CodeBase · © {year}',
    detected: 'Detected',
    testCodesTitle: 'Test codes',
    testPython: 'Python',
    testJava: 'Java',
    testTs: 'TypeScript',
    testRust: 'Rust',
    selfTestTitle: 'Self tests',
    selfTestEmpty: 'No results.',
    selfTestOk: 'OK',
    selfTestFail: 'Fail',
    selfTestExpected: 'Expected: {value}',
    selfTestActual: 'Actual: {value}',
    logicTitle: 'Execution logic',
    logicDesc: 'Step forward and back to understand the flow.',
    output: 'Output',
    noOutput: 'No output yet.',
    trace: 'Trace',
    noTrace: 'No steps to show. Use Python, Java, TypeScript, or Rust.',
    step: 'Step',
    line: 'Line',
    state: 'State',
    note: 'Note',
    changes: 'Changes',
    operation: 'Operation',
    noOperation: 'No operation',
    outputLine: 'Output on this step',
    stepBack: 'Back',
    stepForward: 'Next',
    stepsLimitTitle: 'Step limit reached ({limit})',
    stepsLimitDesc: 'Use a smaller example to see the full execution.',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    theme: 'Theme',
    principlesTitle: 'Miniko principles',
    principle1: 'Didactic: each step shows clear changes.',
    principle2: 'Predictable: interprets a stable subset.',
    principle3: 'Focused: only Python, Java, TypeScript, and Rust.',
    docsTitle: 'Quick guide',
    docs1: 'Paste a short example and step through it.',
    docs2: 'If it stalls, reduce the code or simplify the loop.',
    docs3: 'Verify outputs in the Autotests panel.',
    docs4: 'If something fails, share the snippet and detected language.',
    selfTestDesc: 'Compares expected output with actual output to validate the interpreter.',
    safetyNote: 'Interpreted locally with step limits.',
    code: 'Code',
    frames: 'Frames',
    noVariables: 'No variables',
    noChanges: 'No changes in this step',
  },
}

export function useI18n() {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('miniko-locale')
    return stored === 'es' || stored === 'en' ? stored : 'es'
  })

  useEffect(() => {
    localStorage.setItem('miniko-locale', locale)
  }, [locale])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let value = TRANSLATIONS[locale][key] ?? key
      if (vars) {
        Object.entries(vars).forEach(([name, replacement]) => {
          value = value.replaceAll(`{${name}}`, String(replacement))
        })
      }
      return value
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t])
  return value
}
