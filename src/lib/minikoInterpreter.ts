export type MinikoTraceEntry = {
  step: number
  line: string
  state: string
  note: string
}

type RunResult = {
  output: string[]
  trace: MinikoTraceEntry[]
}

type JumpMap = {
  ifToEnd: Map<number, number>
  loopToEnd: Map<number, number>
  endToLoop: Map<number, number>
}

export function runMiniko(source: string): RunResult {
  const lines = source.split('\n')
  const { ifToEnd, loopToEnd, endToLoop } = buildJumpMap(lines)
  const vars = new Map<string, number>()
  const output: string[] = []
  const trace: MinikoTraceEntry[] = []
  let step = 1
  let pc = 0
  const loopCounters = new Map<number, number>()

  while (pc < lines.length) {
    const raw = lines[pc]
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) {
      pc += 1
      continue
    }

    const tokens = tokenize(line)
    const cmd = tokens[0]
    let note = ''

    if (cmd === 'set') {
      const name = tokens[1]
      const value = resolveValue(tokens[2], vars)
      vars.set(name, value)
      note = `set ${name} = ${value}`
      pc += 1
    } else if (cmd === 'add' || cmd === 'sub' || cmd === 'mul' || cmd === 'div') {
      const name = tokens[1]
      const base = vars.get(name) ?? 0
      const value = resolveValue(tokens[2], vars)
      const next = applyMath(cmd, base, value)
      vars.set(name, next)
      note = `${cmd} ${name} ${value}`
      pc += 1
    } else if (cmd === 'print') {
      const value = resolveValue(tokens[1], vars)
      output.push(String(value))
      note = `print ${value}`
      pc += 1
    } else if (cmd === 'if') {
      const condition = evaluateCondition(tokens.slice(1), vars)
      if (!condition) {
        const target = ifToEnd.get(pc)
        pc = target !== undefined ? target + 1 : pc + 1
        note = 'skip if'
      } else {
        note = 'enter if'
        pc += 1
      }
    } else if (cmd === 'endif') {
      note = 'end if'
      pc += 1
    } else if (cmd === 'loop') {
      const loopStart = pc
      const count = Math.max(0, resolveValue(tokens[1], vars))
      if (!loopCounters.has(loopStart)) {
        loopCounters.set(loopStart, count)
      }
      const remaining = loopCounters.get(loopStart) ?? 0
      if (remaining <= 0) {
        const target = loopToEnd.get(loopStart)
        pc = target !== undefined ? target + 1 : loopStart + 1
        loopCounters.delete(loopStart)
        note = 'skip loop'
      } else {
        note = `loop x${remaining}`
        pc += 1
      }
    } else if (cmd === 'end') {
      const loopStart = endToLoop.get(pc)
      if (loopStart !== undefined) {
        const remaining = (loopCounters.get(loopStart) ?? 0) - 1
        if (remaining <= 0) {
          loopCounters.delete(loopStart)
          note = 'end loop'
          pc += 1
        } else {
          loopCounters.set(loopStart, remaining)
          note = `repeat loop (${remaining} left)`
          pc = loopStart + 1
        }
      } else {
        pc += 1
      }
    } else {
      note = 'unknown command'
      pc += 1
    }

    trace.push({
      step,
      line,
      state: snapshot(vars),
      note,
    })
    step += 1
  }

  return { output, trace }
}

function tokenize(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
}

function resolveValue(token: string | undefined, vars: Map<string, number>) {
  if (!token) return 0
  const asNumber = Number(token)
  if (!Number.isNaN(asNumber)) {
    return asNumber
  }
  return vars.get(token) ?? 0
}

function applyMath(cmd: string, base: number, value: number) {
  if (cmd === 'add') return base + value
  if (cmd === 'sub') return base - value
  if (cmd === 'mul') return base * value
  if (cmd === 'div') return value === 0 ? base : base / value
  return base
}

function evaluateCondition(tokens: string[], vars: Map<string, number>) {
  const left = resolveValue(tokens[0], vars)
  const op = tokens[1]
  const right = resolveValue(tokens[2], vars)
  switch (op) {
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

function buildJumpMap(lines: string[]): JumpMap {
  const ifStack: number[] = []
  const loopStack: number[] = []
  const ifToEnd = new Map<number, number>()
  const loopToEnd = new Map<number, number>()
  const endToLoop = new Map<number, number>()

  lines.forEach((raw, index) => {
    const line = raw.trim()
    if (line.startsWith('if ')) {
      ifStack.push(index)
    } else if (line === 'endif') {
      const start = ifStack.pop()
      if (start !== undefined) {
        ifToEnd.set(start, index)
      }
    } else if (line.startsWith('loop ')) {
      loopStack.push(index)
    } else if (line === 'end') {
      const start = loopStack.pop()
      if (start !== undefined) {
        loopToEnd.set(start, index)
        endToLoop.set(index, start)
      }
    }
  })

  return { ifToEnd, loopToEnd, endToLoop }
}

function snapshot(vars: Map<string, number>) {
  if (vars.size === 0) return '{}'
  return `{ ${Array.from(vars.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')} }`
}
