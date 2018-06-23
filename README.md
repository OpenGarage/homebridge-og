# OpenGarage Garage door

Homebridge plugin for [OpenGarage](https://opengarage.io).
This plugin is a modified version of [homebridge-loxone-garage](https://www.npmjs.com/package/homebridge-loxone-garage)
made to work with OpenGarage

## Installation

This plugin only works with OpenGarage Firmware 1.0.8 or later.

You must have NodeJS `v8.1.4` or later installed as `homebridge-og` depends on JavaScript features introduced at that point. Check your node version:

```
node --version
```

You need [Homebridge](https://github.com/nfarina/homebridge) installed and configured. This plugin was developed against Homebridge `0.4.43`.

```
npm install -g homebridge
```

Install this plugin from source:

```
git clone ...
cd homebridge-og
npm pack
sudo npm install -g homebridge-og-3.0.0.tgz
```

## Configuration

Update your config.json configuration file. See the example below.

- `ip` - The host name or IP address of your OpenGarage device
- `key` - The password to control your OpenGarage device
- `openCloseDurationSecs` - The amount of time within which an open/close transition should reliably complete (and OpenGarage will sense the new door state), including the OpenGarage warning beeps.
- `pollFrequencySecs` - How often to poll OpenGarage for state changes. This will enable state updates for the garage door when not controlled via this homebridge plugin.

### Sample config.json

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
   the warning beeps if applicable. Add a few seconds and set the value `openCloseDurationSecs` accordingly.
