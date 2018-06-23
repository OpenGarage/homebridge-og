# OpenGarage Garage door

Homebridge plugin for [OpenGarage](https://opengarage.io).
This plugin is a modified version of [homebridge-loxone-garage](https://www.npmjs.com/package/homebridge-loxone-garage)
made to work with OpenGarage

## Installation

1. Install homebridge using: npm install -g homebridge
1. Install this plugin using: npm install -g homebridge-og
1. Update your config.json configuration file. See the example below.

## Example config.json

```json
    {
        "accessories":
        [
            {
                "accessory": "OpenGarage",
                "name": "Garage",
                "ip": "192.168.0.4",
                "key": "YourPassword",
                "openCloseDurationSecs": 22,
                "pollFrequencySecs": 60
            }
        ]
    }
```

## NOTES

1. Change the IP in the example to the IP or hostname of your OpenGarage.
1. Be sure to change the "YourPassword" part to the password used for your OpenGarage.
1. Enjoy telling Siri to open and close your Garage as well as receiving push notifications on state change.
1. Measure how long it takes for your garage door to close after triggering the state change using OpenGarage, including
   the warning beeps if applicable. Set the value `openCloseDurationSecs` accordingly.
