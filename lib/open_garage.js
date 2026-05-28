function OpenGarageModule(log, config, {Service, Characteristic, HapStatusError, HAPStatus, openGarageApi, setTimeout, clearTimeout, Date}) {
    let openCloseDurationMs = (config.openCloseDurationSecs || OpenGarageModule.defaults.openCloseDurationSecs) * 1000
    let pollFrequencyMs = (config.pollFrequencySecs || OpenGarageModule.defaults.pollFrequencySecs) * 1000
    let logFrequencyMs = (config.logFrequencySecs || OpenGarageModule.defaults.logFrequencySecs) * 1000
    const transitionPollMs = 2000

    class OpenGarage {
        constructor(name) {
            this.name = name
            this.currentState = {error: "Successful poll not yet completed"}
            this.lastTarget = undefined
            this.lastLogTime = 0

            this.informationService = new Service.AccessoryInformation()
                .setCharacteristic(Characteristic.Manufacturer, "OpenGarage")
                .setCharacteristic(Characteristic.Model, "OpenGarage")
                .setCharacteristic(Characteristic.SerialNumber, config.ip || "unknown")

            this.garageService = new Service.GarageDoorOpener(this.name)

            this.garageService
                .getCharacteristic(Characteristic.CurrentDoorState)
                .onGet(this.getState.bind(this))

            this.garageService
                .getCharacteristic(Characteristic.TargetDoorState)
                .onGet(this.targetDoorState.bind(this))
                .onSet(this.changeState.bind(this))

            this.garageService
                .getCharacteristic(Characteristic.ObstructionDetected)
                .onGet(this.getStateObstruction.bind(this))

            this.vehicleService = new Service.OccupancySensor("Vehicle Present")

            this.vehicleService.getCharacteristic(Characteristic.OccupancyDetected)
                .onGet(this.currentVehicleState.bind(this))

            this.garageService.setPrimaryService(true)
            this.garageService.addLinkedService(this.vehicleService)

            this.pollStateRefreshLoop()
        }

        getStateObstruction() {
            return false
        }

        async getState() {
            await this.triggerStateRefresh().catch((err) => log("Error getting state: %s", err))
            return this.currentDoorState()
        }

        isClosed() {
            if (this.currentState.success)
                return this.currentState.success.door === 0
            else
                throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
        }

        isVehiclePresent() {
            if (this.currentState.success)
                return this.currentState.success.vehicle === 1
            else
                throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE)
        }

        targetDoorState() {
            if (!this.lastTarget || ((Date.now() - this.lastTarget.ts) >= openCloseDurationMs)) {
                if (this.isClosed())
                    return Characteristic.TargetDoorState.CLOSED
                else
                    return Characteristic.TargetDoorState.OPEN
            } else {
                if (this.lastTarget.closed)
                    return Characteristic.TargetDoorState.CLOSED
                else
                    return Characteristic.TargetDoorState.OPEN
            }
        }

        currentDoorState() {
            if (this.lastTarget && (Date.now() - this.lastTarget.ts) < openCloseDurationMs) {
                return this.lastTarget.closed
                    ? Characteristic.CurrentDoorState.CLOSING
                    : Characteristic.CurrentDoorState.OPENING
            }
            if (this.isClosed())
                return Characteristic.CurrentDoorState.CLOSED
            else
                return Characteristic.CurrentDoorState.OPEN
        }

        currentVehicleState() {
            if (this.isVehiclePresent())
                return Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            else
                return Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED
        }

        triggerStateRefresh() {
            return openGarageApi.getState().then(
                (state) => {
                    const prevState = this.currentState.success
                    this.currentState = {success: state}
                    this.notify()

                    const changed = prevState !== undefined &&
                        (prevState.door !== state.door || prevState.vehicle !== state.vehicle)
                    const now = Date.now()
                    const status = () => `garage: ${this.isClosed() ? "closed" : "open"}, vehicle: ${this.isVehiclePresent() ? "present" : "not present"}`

                    if (changed) {
                        log("State changed — %s", status())
                        this.lastLogTime = now
                    } else if ((now - this.lastLogTime) >= logFrequencyMs) {
                        log.debug("Status — %s", status())
                        this.lastLogTime = now
                    }

                    return this.isClosed()
                },
                (error) => {
                    this.currentState = {error: error}
                    throw error
                }
            )
        }

        pollStateRefreshLoop() {
            if (this.pollTimer) clearTimeout(this.pollTimer)
            this.pollTimer = setTimeout(() => this.pollStateRefreshLoop(), pollFrequencyMs)

            this.triggerStateRefresh().catch((err) => {
                log("Error polling state", err)
            })
        }

        notify() {
            this.garageService.getCharacteristic(Characteristic.CurrentDoorState)
                .updateValue(this.currentDoorState())
            this.garageService.getCharacteristic(Characteristic.TargetDoorState)
                .updateValue(this.targetDoorState())
            this.vehicleService.getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(this.currentVehicleState())
        }

        async changeState(state) {
            const targetStateClosed = state === Characteristic.TargetDoorState.CLOSED
            log("Set state to %s", targetStateClosed ? "closed" : "open")

            try {
                await openGarageApi.setTargetState(targetStateClosed)
            } catch (err) {
                log("Error sending command: %s", err.message || err)
                throw err
            }

            log("Target state successfully received.")

            if (this.transitionTimer) clearTimeout(this.transitionTimer)
            this.lastTarget = {ts: Date.now(), closed: targetStateClosed}
            this.garageService.getCharacteristic(Characteristic.CurrentDoorState)
                .updateValue(this.currentDoorState())
            this.garageService.getCharacteristic(Characteristic.TargetDoorState)
                .updateValue(this.targetDoorState())
            this._scheduleTransitionPoll(targetStateClosed, this.lastTarget.ts)
        }

        _scheduleTransitionPoll(targetStateClosed, targetTs) {
            if (Date.now() - targetTs >= openCloseDurationMs) {
                this.transitionTimer = undefined
                this.triggerStateRefresh().catch((err) => log("Error polling after state change", err))
                return
            }
            this.transitionTimer = setTimeout(() => {
                this.triggerStateRefresh()
                    .then((isClosed) => {
                        if (!this.lastTarget || this.lastTarget.ts !== targetTs) return
                        if (isClosed === targetStateClosed) {
                            this.lastTarget = undefined
                            this.notify()
                            return
                        }
                        this._scheduleTransitionPoll(targetStateClosed, targetTs)
                    })
                    .catch((err) => {
                        log("Error during transition poll: %s", err)
                        if (this.lastTarget && this.lastTarget.ts === targetTs)
                            this._scheduleTransitionPoll(targetStateClosed, targetTs)
                    })
            }, transitionPollMs)
        }

        shutdown() {
            if (this.pollTimer) clearTimeout(this.pollTimer)
            if (this.transitionTimer) clearTimeout(this.transitionTimer)
        }
    }

    return OpenGarage
}
OpenGarageModule.defaults = {
    openCloseDurationSecs: 25,
    pollFrequencySecs: 60,
    logFrequencySecs: 60,
}
module.exports = OpenGarageModule
