#!/usr/bin/env bun
/**
 * Cursor sessionStart hook: emit additional_context from electrobun-skill-routing.md.
 * Cursor may merge this into the session (see Cursor Hooks docs). If injection is
 * unreliable in your build, the alwaysApply rule still points agents at the same file.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const routingPath = join(here, '../electrobun-skill-routing.md')
const additional_context = readFileSync(routingPath, 'utf8')
await Bun.stdin.text()
// Newline-terminated JSON so Cursor's hook parser reliably reads one full line
// (stdout.write can exit before flush; console.log buffers correctly in Bun).
console.log(JSON.stringify({ additional_context }))
