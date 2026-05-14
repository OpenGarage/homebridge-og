# Changelog

## [3.2.0] - 2026-05-14

### Added
- `AccessoryInformation` service now populated with manufacturer, model, and serial number (device IP)
- Vehicle occupancy sensor linked to garage door service via `addLinkedService` — surfaces as a visible tile in the Home app
- `shutdown()` support — poll and transition timers are cancelled when Homebridge unloads the accessory
- `response.ok` check on all HTTP calls — HTTP 4xx/5xx errors are now reported clearly instead of failing silently on JSON parse

### Changed
- Minimum Homebridge version lowered from `2.0.0` to `1.8.0` — compatible with both the 1.x and 2.x series
- Migrated all HAP characteristic handlers from deprecated `.on('get')`/`.on('set')` callbacks to `.onGet()`/`.onSet()` — eliminates deprecation warnings on Homebridge 2.x
- `registerAccessory` updated to preferred 2-argument form
- `changeState` is now async — resolves once the command is acknowledged; door transition polling continues in the background
- Transition timer is now tracked and cancelled on rapid consecutive open/close commands, preventing stacked state refresh calls
- Invalid JSON responses from the device now produce a descriptive error instead of a raw `SyntaxError`
- Dev dependencies: `eslint` bumped to `^8.57.1`, `mocha` bumped to `^11.7.5`

### Fixed
- README: Node 18 requirement correctly attributed to native fetch, not Homebridge 2
- README: install-from-source command uses dynamic version instead of hardcoded `3.1.1`
