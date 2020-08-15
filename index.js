const OpenGarageModule = require("./lib/open_garage.js")
const OpenGarageApiModule = require("./lib/open_garage_api.js")

module.exports = function( homebridge ) {
    let Service = homebridge.hap.Service
    let Characteristic = homebridge.hap.Characteristic

    class OpenGarageConnect {
        constructor(log, config) {
            let OpenGarageApi = OpenGarageApiModule(log)
            let openGarageApi = new OpenGarageApi({
                ip: config.ip,
                key: config.key
            })
            let OpenGarage = OpenGarageModule(log, config, {Service, Characteristic, openGarageApi, setTimeout, clearTimeout, Date})
            this.openGarage = new OpenGarage(config.name, true)
        }
        getServices() {
            return([
		   this.openGarage.garageService,
		   this.openGarage.vehicleService,
	           ])
        }
    }
    homebridge.registerAccessory( "homebridge-og", "OpenGarage", OpenGarageConnect );
};
