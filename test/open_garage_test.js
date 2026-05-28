const assert = require('assert');
const OpenGarageModule = require("../lib/open_garage.js")

class MockDevice {
  constructor(name) {
    this.name = name
    this.characteristics = {}
  }
  getCharacteristic(characteristic) {
    if (!(characteristic.name in this.characteristics))
      this.characteristics[characteristic.name] = new Characteristic(characteristic)
    return this.characteristics[characteristic.name]
  }
  setCharacteristic(characteristic, value) {
    this.characteristics[characteristic.name] = value
    return this
  }
  setPrimaryService() { return this }
  addLinkedService() { return this }
}

class Characteristic {
    constructor(char) {
        this.name = char.name
        this.characteristic = char
        this._handlers = {}
    }

    onGet(fn) {
        this._handlers['get'] = fn
        return this
    }

    onSet(fn) {
        this._handlers['set'] = fn
        return this
    }

    triggerGetSync() {
        return this._handlers['get']()
    }

    async triggetSetAsync(value) {
        return await this._handlers['set'](value)
    }

    updateValue(value) {
        this.value = value
    }
}

class GarageDoorOpener extends MockDevice {}
class OccupancySensor extends MockDevice {}
class AccessoryInformation extends MockDevice {}

class MockHapStatusError extends Error {
    constructor(status) {
        super(`HAP Status ${status}`)
        this.hapStatus = status
    }
}
const MockHAPStatus = {SERVICE_COMMUNICATION_FAILURE: -70402}
const MockHomebridge = {
    hap: {
        uuid: { generate: (input) => input },
        Service: {GarageDoorOpener, OccupancySensor, AccessoryInformation},
        Characteristic: {
            Manufacturer: {name: "Manufacturer"},
            Model: {name: "Model"},
            SerialNumber: {name: "SerialNumber"},
            TargetDoorState: {name: "TargetDoorState", CLOSED: "T_CLOSED", OPEN: "T_OPEN"},
            CurrentDoorState: {name: "CurrentDoorState", CLOSED: "CLOSED", OPEN: "OPEN"},
            ObstructionDetected: {name: "ObstructionDetected"},
            OccupancyDetected: {name: "OccupancyDetected", OCCUPANCY_DETECTED: "DETECTED", OCCUPANCY_NOT_DETECTED: "NOT_DETECTED"}
        }
    }
}

function MockLog() {
    console.log.apply(null, arguments)
}
MockLog.debug = console.log

function eventually(fn) {
    let deadline = Date.now() + 1000
    return new Promise((success, reject) => {
        let timer = setInterval(() => {
            try {
                success(fn())
                clearInterval(timer)
            }
            catch(err) {
                if (Date.now() > deadline) {
                    clearInterval(timer)
                    reject(err)
                }
            }
        }, 5)
    })
}

describe('OpenGarage', function() {
    var openGarage
    var mockOpenGarageApi
    var MockSetTimeout
    var MockClearTimeout
    var MockDate
    var currentDoorState
    var targetDoorState
    const pollFrequencyMs = OpenGarageModule.defaults.pollFrequencySecs * 1000
    const openDurationMs = OpenGarageModule.defaults.openCloseDurationSecs * 1000
    const transitionPollMs = 2000
    let Characteristic = MockHomebridge.hap.Characteristic
    let Service = MockHomebridge.hap.Service

    class MockOpenGarageApi {
        constructor() {
            this.isClosed = false
        }
        getState() {
            return Promise.resolve({door: this.isClosed ? 0 : 1})
        }

        setTargetState(closed) {
            this.targetClosedState = closed
            return Promise.resolve(true)
        }
    }

    beforeEach(() => {
        let timers = []
        let timerIdx = 0
        MockSetTimeout = function(fn, duration) {
            timerIdx += 1
            let timer = {idx: timerIdx, fn, duration}
            timers.push(timer)
            return timer
        }
        MockClearTimeout = function({idx}) {
            arrayIdx = timers.findIndex((timer) => timer.idx == idx)
            if (arrayIdx != -1)
                timers.splice(arrayIdx, 1)
        }
        MockSetTimeout.getTimers = () => timers
        MockSetTimeout.invoke = ({idx}) => {
            let timer = timers.find((timer) => timer.idx == idx)
            MockClearTimeout(timer)
            timer.fn()
        }
        MockSetTimeout.clear = () => { timers = [] }
        MockDate = {
            currentTime: 1529629810000,
            now: () => MockDate.currentTime
        }
        mockOpenGarageApi = new MockOpenGarageApi
        let OpenGarage = OpenGarageModule(MockLog, {}, {
            openGarageApi: mockOpenGarageApi,
            Service: Service,
            Characteristic: Characteristic,
            HapStatusError: MockHapStatusError,
            HAPStatus: MockHAPStatus,
            setTimeout: MockSetTimeout,
            clearTimeout: MockClearTimeout,
            Date: MockDate})
        mockOpenGarageApi.isClosed = true
        openGarage = new OpenGarage("garage", true)
        currentDoorState = openGarage.garageService.getCharacteristic(Characteristic.CurrentDoorState)
        targetDoorState = openGarage.garageService.getCharacteristic(Characteristic.TargetDoorState)
    })

    describe('#constructor', () => {
        it('throws an error if last poll result was an error', async () => {
            mockOpenGarageApi.getState = () => Promise.reject("HTTP ERROR")
            MockSetTimeout.invoke(openGarage.pollTimer)
            await eventually(() => assert.ok(openGarage.currentState.error))
            await assert.rejects(currentDoorState.triggerGetSync())
        })

        it('polls the status and propagates values to Home', async () => {
            MockSetTimeout.invoke(openGarage.pollTimer)
            assert.equal(openGarage.isClosed(), true)
            assert.equal(Characteristic.CurrentDoorState.CLOSED, currentDoorState.value)
            assert.equal(Characteristic.TargetDoorState.CLOSED, targetDoorState.value)

            pollTimer = openGarage.pollTimer
            mockOpenGarageApi.isClosed = false

            MockSetTimeout.invoke(pollTimer)

            // new timer should be scheduled
            assert.notEqual(pollTimer, openGarage.pollTimer)

            // when api call returns these should be updated
            await eventually(() => {
                assert.equal(openGarage.isClosed(), false)
                assert.equal(Characteristic.CurrentDoorState.OPEN, currentDoorState.value)
                assert.equal(Characteristic.TargetDoorState.OPEN, targetDoorState.value)
            })
        })

        it('sends the command to close the garage door', async () => {
            await targetDoorState.triggetSetAsync(Characteristic.TargetDoorState.OPEN)

            assert.equal(mockOpenGarageApi.targetClosedState, false)
            assert.equal(openGarage.currentDoorState(), Characteristic.CurrentDoorState.OPENING)
            assert.equal(openGarage.targetDoorState(), Characteristic.TargetDoorState.OPEN)
            assert.equal(currentDoorState.value, Characteristic.CurrentDoorState.OPENING)
            assert.equal(targetDoorState.value, Characteristic.TargetDoorState.OPEN)

            let [pollTimer, afterTimer] = MockSetTimeout.getTimers()
            assert.equal(pollTimer.duration, pollFrequencyMs) // default poll
            assert.equal(afterTimer.duration, transitionPollMs) // rapid poll interval

            mockOpenGarageApi.isClosed = false
            MockSetTimeout.invoke(afterTimer)

            await eventually(() =>{
                assert.equal(mockOpenGarageApi.targetClosedState, false)
                assert.equal(openGarage.currentDoorState(), Characteristic.CurrentDoorState.OPEN)
                assert.equal(openGarage.targetDoorState(), Characteristic.TargetDoorState.OPEN)
            })
        })

        it('reverts the target door state if the state does not change after openDurationMs', async () => {
            await targetDoorState.triggetSetAsync(Characteristic.TargetDoorState.OPEN)

            assert.equal(mockOpenGarageApi.targetClosedState, false)
            assert.equal(openGarage.currentDoorState(), Characteristic.CurrentDoorState.OPENING)
            assert.equal(openGarage.targetDoorState(), Characteristic.TargetDoorState.OPEN)

            let [pollTimer, afterTimer] = MockSetTimeout.getTimers()
            assert.equal(pollTimer.duration, pollFrequencyMs) // default poll
            assert.equal(afterTimer.duration, transitionPollMs) // rapid poll interval

            MockSetTimeout.invoke(afterTimer)

            await eventually(() =>{
                assert.equal(mockOpenGarageApi.targetClosedState, false)
                assert.equal(openGarage.currentDoorState(), Characteristic.CurrentDoorState.OPENING)
                assert.equal(openGarage.targetDoorState(), Characteristic.TargetDoorState.OPEN)
            })
            MockDate.currentTime += openDurationMs
            assert.equal(openGarage.targetDoorState(), Characteristic.TargetDoorState.CLOSED)
        })
    })

});
