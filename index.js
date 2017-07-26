var request = require( "request" ),
	fs = require( "fs" ),
	Service, Characteristic;

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
        .on( "get", this.getState.bind( this ) )
        .on( "set", this.changeState.bind( this ) );
};

OpenGarageConnect.prototype.getState = function( callback ) {
    this.log( "Getting current state..." );

    request.get( {
        url: "http://" + this.ip + "/jc"
    }, function( err, response, body ) {
        if ( !err && response.statusCode === 200 ) {
            var json = JSON.parse( body ),
				value = json.door,
				state, statedoor;

            if ( value === 0 ) {
                state = "closed";
                statedoor = true;
            }

            if ( value === 1 ) {
                state = "open";
                statedoor = false;
            }

            this.log( "Status garage: %s", state );
            callback( null, statedoor );
        } else {
            this.log( "Error getting state: %s", err );
            callback( err );
        }
    }.bind( this ) );
};

OpenGarageConnect.prototype.changeState = function( state, callback ) {
    var doorState = ( state == Characteristic.TargetDoorState.CLOSED ) ? "closed" : "open";
    this.log( "Set state to %s", doorState );

    request.get( {
        url: "http://" + this.ip + "/cc?dkey=" + this.key + "&click=1"
    }, function( err, response, body ) {
        if ( !err && response.statusCode === 200 ) {
            this.log( "State change complete." );
            var currentState = ( state == Characteristic.TargetDoorState.CLOSED ) ? Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN;

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
