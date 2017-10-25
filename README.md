# OpenGarage Garage door

Homebridge plugin for [OpenGarage](https://opengarage.io).
This plugin is a slightly modified version of [homebridge-loxone-garage](https://www.npmjs.com/package/homebridge-loxone-garage)
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
                "key": "YourPassword"
            }
        ]
    }
```

## NOTES

1. Change the IP in the example to the IP or hostname of your OpenGarage.
1. Be sure to change the "YourPassword" part to the password used for your OpenGarage.
1. Enjoy telling Siri to open and close your Garage.
1. You can also enable push notifications for your OpenGarage when it is opened or closed via the Home app on iOS now too.

(Mine was enabled by default)
