var request = require( "request" );
var Service;
var Characteristic;

module.exports = function( homebridge ) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory( "homebridge-og", "OpenGarage", OpenGarageConnect );
};

class OpenGarageConnect {
    constructor( log, config ) {
        this.log = log;

        this.name = config.name;
        this.ip = config.ip;
        this.key = config.key;

        this.garageService = new Service.GarageDoorOpener( this.name );

        this.garageService
            .getCharacteristic( Characteristic.CurrentDoorState )
            .on( "get", this.getState.bind( this ) );

        this.garageService
            .getCharacteristic( Characteristic.TargetDoorState )
            .on( "get", this.getState.bind( this ) )
            .on( "set", this.changeState.bind( this ) );

        this.garageService
		        .getCharacteristic( Characteristic.ObstructionDetected )
		        .on( "get", this.getStateObstruction.bind( this ) );
    }

    getStateObstruction ( callback ) {
        callback( null, false );
    };

    getState ( callback ) {
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

    changeState ( state, callback ) {
        this.log( "Set state to %s", state === Characteristic.TargetDoorState.CLOSED ? "closed" : "open" );

        this.getState( function( err, actualState ) {
            if ( !!state === actualState ) {

                setTimeout( function() {
                    this.garageService.setCharacteristic( Characteristic.CurrentDoorState, state );
                    callback( null );
                }.bind( this ), 10000 );
            } else {

                request.get( { url: "http://" + this.ip + "/cc?dkey=" + this.key + "&click=1" }, function( err, response, body ) {

                    if ( !err && response.statusCode === 200 ) {
                        this.log( "State change complete." );
                        var currentState = ( state === Characteristic.TargetDoorState.CLOSED ) ?
                            Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN;

                        /** Add delay to wait for the door to finish opening or closing */
                        setTimeout( function() {
                            this.garageService.setCharacteristic( Characteristic.CurrentDoorState, currentState );
                            callback( null );
                        }.bind( this ), 10000 );
                    } else {
                        this.log( "Error '%s' setting door state. Response: %s", err, body );
                        callback( err || new Error( "Error setting door state." ) );
                    }
                }.bind( this ) );
            }
        }.bind( this ) );
    };

    getServices () {
        return [ this.garageService ];
    };
}
