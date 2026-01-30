import { useCallback, useEffect, useMemo, useState } from 'react'

export type Locale = 'es' | 'en'

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  es: {
    title: 'Plataforma Miniko',
    subtitle: 'Visualiza la ejecución paso a paso para aprender mejor.',
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
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    language: 'Idioma',
    theme: 'Tema',
    principlesTitle: 'Principios Miniko',
    principle1: 'Comprensible: cada ejecución tiene historia.',
    principle2: 'Rápido: feedback instantáneo.',
    principle3: 'Seguro: sandbox y límites de tiempo.',
    docsTitle: 'Guía rápida',
    docs1: 'El visor interpreta un subconjunto de cada lenguaje.',
    docs2: 'Usa ejemplos cortos y evita librerías externas, aún estámos en desarrollo :)',
    docs3: 'Si algo falla, simplifica el código y revisa paso a paso.',
    docs4: 'Ideal para escritorio, pero responsive en cualquier dispositivo.',
    safetyNote: 'Se interpreta localmente con límites de pasos.',
    code: 'Código',
    frames: 'Frames',
    noVariables: 'Sin variables',
    noChanges: 'Sin cambios en este paso',
  },
  en: {
    title: 'Miniko Platform',
    subtitle: 'Visualize execution step by step to learn faster.',
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
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    theme: 'Theme',
    principlesTitle: 'Miniko principles',
    principle1: 'Readable: every run has a story.',
    principle2: 'Fast: instant feedback.',
    principle3: 'Safe: sandbox + time limits.',
    docsTitle: 'Quick guide',
    docs1: 'The viewer interprets a subset of each language.',
    docs2: 'Use short examples and avoid external libraries.',
    docs3: 'If something fails, simplify the code and step through it, we are still in development :) ',
    docs4: 'Ideal for desktop, but responsive on any device.',
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
