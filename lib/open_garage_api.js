const request = require("request-promise-native")
const http = require("http")

function OpenGarageApiModule(log) {
    class OpenGarageApi{
        constructor({ip, key}) {
            this.key = key
            this.baseUrl = "http://" + ip
            this.agent = new http.Agent({ keepAlive: false })
        }

        _request(options, retries = 1) {
            options.agent = this.agent
            options.timeout = 5000
            return request.get(options).catch(err => {
                if (retries > 0 && err.cause) {
                    if (err.cause.code === 'ECONNRESET' || err.cause.code === 'ETIMEDOUT') {
                        log(`Transient ${err.cause.code} error, retrying request`)
                        return this._request(options, retries - 1)
                    }
                }
                throw err
            })
        }

        urlFor(path, params) {
            let url = this.baseUrl + path + "?dkey=" + this.key
            if (params)
                url = url + "&" + params
            return url
        }


        getState() {
            return this._request({ url: this.urlFor("/jc") }).then(
                (body) => JSON.parse(body),
                (err) => {
                    log("Error getting state:", err.message)
                    throw err
                })
        }

        _handleResponse(body) {
            let responseCode = JSON.parse(body).result
            switch(responseCode) {
            case 1: return true
            case 2: throw new Error("Not authorized")
            case 3: throw new Error("Mismatch")
            case 16: throw new Error("Data missing")
            case 17: throw new Error("Out of range")
            case 18: throw new Error("Data Format Error")
            case 32: throw new Error("Page Not Found")
            case 48: throw new Error("Not Permitted")
            case 64: throw new Error("Upload Failed")
            default:
                throw new Error("Unrecognized response code: " + responseCode)
            }
        }

        setTargetState(closed) {
            let url = this.urlFor(
                "/cc",
                closed ? "close=1" : "open=1")
            log(url)
            return this._request({url}).then((body) => this._handleResponse(body))
        }
    }

    return OpenGarageApi
}
module.exports = OpenGarageApiModule
