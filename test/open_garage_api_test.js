const assert = require('assert')
const util = require('util')
const OpenGarageApiModule = require('../lib/open_garage_api.js')

describe('OpenGarageApi', function() {
    it('logs a warning when requests time out', async function() {
        const logs = []
        const warns = []
        function log() {
            logs.push(util.format.apply(util, arguments))
        }
        log.warn = function() {
            warns.push(util.format.apply(util, arguments))
        }

        const mockFetch = () => Promise.reject(Object.assign(new Error('read ETIMEDOUT'), {code: 'ETIMEDOUT'}))

        const OpenGarageApi = OpenGarageApiModule(log, {fetch: mockFetch})
        const api = new OpenGarageApi({ip: '10.0.0.1', key: 'secret'})

        await assert.rejects(() => api.getState())

        assert(logs.some((message) => message.includes('Error getting state: read ETIMEDOUT')))
        assert(warns.some((message) => message.includes('Host may be down, IP:10.0.0.1')))
    })

    it('falls back to info logging when warn is unavailable', async function() {
        const infoLogs = []
        function log() {
            infoLogs.push(util.format.apply(util, arguments))
        }

        const mockFetch = () => Promise.reject(Object.assign(new Error('read ETIMEDOUT'), {code: 'ETIMEDOUT'}))

        const OpenGarageApi = OpenGarageApiModule(log, {fetch: mockFetch})
        const api = new OpenGarageApi({ip: '10.0.0.2', key: 'secret'})

        await assert.rejects(() => api.getState())

        const fallbackMessage = infoLogs.filter((message) => message.includes('Host may be down, IP:10.0.0.2'))
        assert.equal(fallbackMessage.length, 1)
    })
})
