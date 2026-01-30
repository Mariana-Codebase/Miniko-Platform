//WEB

# Miniko

Miniko is a platform that lets you paste code in Python, Java, TypeScript, or Rust and see how it executes step by step, with visual traces, state, and output.



## Features
- Multi-language detection: Python, TypeScript, Java, Rust
- Visual execution steps with state and output
- Light/Dark themes
- Built-in UI autotests to verify expected outputs

## Autotests
The page includes an **Autotests** panel (in the footer) that runs a small suite of
reference examples for each supported language and compares the actual output
with the expected output. This helps you quickly confirm that the interpreter
is working correctly and that the step trace completes as expected.

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
