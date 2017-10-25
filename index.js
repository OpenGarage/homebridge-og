var request = require( "request" );
var Service
var Characteristic;

module.exports = function( homebridge ) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory( "homebridge-og", "OpenGarage", OpenGarageConnect );
};

function OpenGarageConnect( log, config ) {
    this.log = log;

    this.name = config.name;
    this.ip = config.ip;
    this.key = config.key;

    this.garageservice = new Service.GarageDoorOpener( this.name );

    this.garageservice
        .getCharacteristic( Characteristic.CurrentDoorState )
        .on( "get", this.getState.bind( this ) );

    this.garageservice
        .getCharacteristic( Characteristic.TargetDoorState )
        .on( "set", this.changeState.bind( this ) );
}

OpenGarageConnect.prototype.getState = function( callback ) {
    this.log( "Getting current state..." );

    request.get( { url: "http://" + this.ip + "/jc" }, function( err, response, body ) {
        if ( !err && response.statusCode === 200 ) {
            var value = JSON.parse( body ).door;

            this.log( "Status garage: %s", value === 0 ? "closed" : "open" );
            callback( null, value === 0 ? true : false );
        } else {
            this.log( "Error getting state: %s", err );
            callback( err );
        }
    }.bind( this ) );
};

OpenGarageConnect.prototype.changeState = function( state, callback ) {
    this.log( "Set state to %s", state === Characteristic.TargetDoorState.CLOSED ? "closed" : "open" );

    request.get( { url: "http://" + this.ip + "/cc?dkey=" + this.key + "&click=1" }, function( err, response, body ) {

        if ( !err && response.statusCode === 200 ) {
            this.log( "State change complete." );
            var currentState = ( state === Characteristic.TargetDoorState.CLOSED ) ?
                Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN;

            this.garageservice
                .setCharacteristic( Characteristic.CurrentDoorState, currentState );

            callback( null );
        } else {
            this.log( "Error '%s' setting door state. Response: %s", err, body );
            callback( err || new Error( "Error setting door state." ) );
        }
    }.bind( this ) );
};

OpenGarageConnect.prototype.getServices = function() {
    return [ this.garageservice ];
};
