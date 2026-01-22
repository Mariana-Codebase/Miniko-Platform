# Miniko

Miniko is a platform that lets you paste code in multiple languages and see how it executes step by step, with visual traces, state, and output. It also includes Miniko AI for clear explanations.

⚠️Currently in the early stages of development so bugs may appear, feel free to report any issues!

## Features
- Multi-language detection: Python, TypeScript, Java, C, C++, C#, Go, Rust
- Visual execution steps with state and output
- Light/Dark themes
- Miniko AI explanations, using LiquidAI: LFM2.5-1.2B-Thinking for now

## Local setup
```bash
npm install
npm run dev
```

## AI setup (OpenRouter)
Create a `.env` in the project root:
```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=liquid/lfm-2.5-1.2b-thinking:free
```

Start the dev server:
```bash
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
