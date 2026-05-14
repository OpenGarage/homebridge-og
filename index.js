const OpenGarageModule = require("./lib/open_garage.js")
const OpenGarageApiModule = require("./lib/open_garage_api.js")

let Service
let Characteristic
let HapStatusError
let HAPStatus

class OpenGarageConnect {
    constructor(log, config) {
        const OpenGarageApi = OpenGarageApiModule(log)
        const openGarageApi = new OpenGarageApi({
            ip: config.ip,
            key: config.key
        })
        const OpenGarage = OpenGarageModule(log, config, {Service, Characteristic, HapStatusError, HAPStatus, openGarageApi, setTimeout, clearTimeout, Date})
        this.openGarage = new OpenGarage(config.name)
    }
    getServices() {
        return [
            this.openGarage.informationService,
            this.openGarage.garageService,
            this.openGarage.vehicleService,
        ]
    }
    shutdown() {
        this.openGarage.shutdown()
    }
}

module.exports = (api) => {
    Service = api.hap.Service
    Characteristic = api.hap.Characteristic
    HapStatusError = api.hap.HapStatusError
    HAPStatus = api.hap.HAPStatus
    api.registerAccessory("OpenGarage", OpenGarageConnect)
}
