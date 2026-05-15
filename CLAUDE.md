# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test          # run all mocha tests
npx eslint .      # lint (no lint script in package.json)
```

No build step — the plugin runs directly from source.

## Architecture

The plugin has three layers wired together via dependency injection:

**`index.js`** — Homebridge entry point. Captures HAP globals (`Service`, `Characteristic`, `HapStatusError`, `HAPStatus`) at registration time and injects them into `OpenGarageModule`. Implements `getServices()` and `shutdown()` for Homebridge lifecycle.

**`lib/open_garage.js`** — All HAP/HomeKit logic. `OpenGarageModule(log, config, deps)` is a factory that accepts injected dependencies (including `setTimeout`, `clearTimeout`, `Date`) so the test suite can control time without real timers. Returns an `OpenGarage` class that:
- Maintains `currentState` (last successful poll result or error object)
- Runs a `pollStateRefreshLoop()` on `pollFrequencySecs` interval
- Calls `notify()` → `updateValue()` after every successful poll to push changes to HomeKit
- Tracks `lastTarget` (commanded state + timestamp) to report `OPENING`/`CLOSING` during the `openCloseDurationMs` window
- Sets a `transitionTimer` after `changeState()` to poll again once the door should have finished moving

**`lib/open_garage_api.js`** — HTTP client for the OpenGarage device. `GET /jc` returns door/vehicle state as JSON; `GET /cc?open=1` or `?close=1` sends a command. Uses native `fetch`. Injected as `openGarageApi` dep so tests can mock it without HTTP.

## Key config values

| Config key | Default | Used as |
|---|---|---|
| `openCloseDurationSecs` | 25s | Transition window for OPENING/CLOSING states; also the post-command poll delay |
| `pollFrequencySecs` | 60s | Background poll interval |
| `logFrequencySecs` | 60s | Throttle for routine status log lines |

## Testing pattern

Tests use `MockSetTimeout` which records timers in an array and exposes `.invoke(timer)` to fire them synchronously on demand — no real waiting. `eventually(fn)` polls an assertion up to 1 second for async resolution. The `MockOpenGarageApi` is a simple in-memory stub that resolves `getState()` from `this.isClosed`.
