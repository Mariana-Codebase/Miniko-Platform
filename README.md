//WEB

# Miniko

Miniko is an educational visualizer that lets you paste code in Python, Java, TypeScript, or Rust and see how it executes step by step, with visual traces, state, and output. It focuses on clarity, short examples, and predictable behavior for learning. Still in development.



## Features
- Multi-language detection: Python, TypeScript, Java, Rust
- Visual execution steps with state and output
- Light/Dark themes
- Built-in UI autotests to verify expected outputs
- Step limit indicator to avoid getting stuck on long examples

## Autotests
The page includes an **Autotests** panel (in the footer) that runs a small suite of
reference examples for each supported language and compares the actual output
with the expected output. This helps you quickly confirm that the interpreter
is working correctly and that the step trace completes as expected.
If a test fails, the panel shows the expected output versus the actual output.

## Usage tips
- Keep examples short and focused.
- If a trace stops early, reduce loops or input size.
- Use the Autotests panel as a quick sanity check.

## Local setup
```bash
npm install
npm run dev
```

## Deploy
Use any static hosting for the Vite build:
```bash
npm run build
```
The build output is in `dist/`.

## Docs

Full documentation lives in `docs/README.md`.


## ⚖️ License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is under the **MIT License**.
