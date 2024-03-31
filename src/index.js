require('dotenv').config()
const mqtt = require("mqtt")
const bt = new (require("bluetooth-serial-port").BluetoothSerialPort)();
const { InfluxDB, Point } = require("@influxdata/influxdb-client")

const idb = new InfluxDB({ url: process.env.idb_url, token: process.env.idb_token })
const idbWriteApi = idb.getWriteApi(process.env.idb_org, process.env.idb_bucket)
idbWriteApi.defaultTags({[process.env.idb_default_tag_name]: process.env.idb_default_tag_content})

let mqttOptions = {
    username: process.env.mqtt_username,
    password: process.env.mqtt_password,
    port: process.env.mqtt_port,
}

const timer = ms => new Promise(res => setTimeout(res, ms))

const mqttClient = mqtt.connect(process.env.mqtt_server, mqttOptions)
const topic = "nodejs/test"

mqttClient.on('connect', () => {
    mqttClient.subscribe([topic], () => {
        console.log(`MQTT: subscribe to topic '${topic}'`)
    })
    mqttClient.publish(topic, 'nodejs mqtt test', { qos: 0, retain: false }, (error) => {
        if (error) {
            console.error("MQTT: ", error)
        }
    })
    mqttClient.on("message", (topic, message) => {
        console.log("MQTT: ", topic, message.toString())
    })
})

const initCMD = [
    'AT D', 'AT Z', 'AT E0', 'AT L0', 'AT S0', 'AT H1', 'AT AT0', 'AT STFF', 'AT FE', 'AT SP6', 'AT CRA7EC'
]

function writeBt(message) {
    console.log("bt write: " + message)
    bt.write(Buffer.from(message + '\r\n'), (error) => console.log(error))
}
function btLoop() {
    bt.connect(process.env.bt_mac, 1, async () => {
        console.log("bt connected")
        bt.on("data", (buffer) => {
            const ascii = buffer.toString('ascii')
            console.log(ascii)
        })

        for (const element of initCMD) {
            writeBt(element)
            await timer(500)
        }

        while (true) {
            writeBt(command)
            await timer(10000)
        }
    }, (error) => { console.log(error); btLoop() })
}

parseData(data)
btLoop()

function parseSigned(data) {
    const bits = data.length * 4;
    return ((parseInt(data, 16) + Math.pow(2, bits - 1)) % Math.pow(2, bits)) - Math.pow(2, bits - 1);
}

function parseData(data) {
    let parsedData = {}
    try {
        if (command === '220105') {
            console.log("parseData command === '220105'")
            const fourthBlock = '7EC24',
                fifthBlock = '7EC25',
                extractedFourthBlock = data.substring(data.indexOf(fourthBlock), data.indexOf(fifthBlock)),
                extractedFourthData = extractedFourthBlock.replace(fourthBlock, '');

            if (extractedFourthBlock) {
                parsedData = {
                    SOC_DISPLAY: parseInt(extractedFourthBlock.slice(-2), 16) / 2,
                    SOH: ((parseInt(extractedFourthData.slice(0, 2), 16) << 8) +
                        parseInt(extractedFourthData.slice(2, 4), 16)) / 10
                };
            }
        } else if (command === '220101') {
            console.log("parseData command === '220101'")
            let firstBlock = '7EC21',
                extractedFirstBlock = ((data.indexOf(firstBlock) !== -1) ? data.substring(data.indexOf(firstBlock), data.indexOf(firstBlock) + 19) : ''),
                extractedFirstData = extractedFirstBlock.replace(firstBlock, ''),
                secondBlock = '7EC22',
                extractedSecondBlock = ((data.indexOf(secondBlock) !== -1) ? data.substring(data.indexOf(secondBlock), data.indexOf(secondBlock) + 19) : ''),
                extractedSecondData = extractedSecondBlock.replace(secondBlock, ''),
                chargingBits = (parseInt(extractedFirstData.substr(-4).slice(0, 2), 16) >>> 0).toString(2),
                thirdBlock = '7EC23',
                extractedThirdBlock = ((data.indexOf(thirdBlock) !== -1) ? data.substring(data.indexOf(thirdBlock), data.indexOf(thirdBlock) + 19) : ''),
                extractedThirdData = extractedThirdBlock.replace(thirdBlock, ''),
                fourthBlock = '7EC24',
                extractedFourthBlock = ((data.indexOf(fourthBlock) !== -1) ? data.substring(data.indexOf(fourthBlock), data.indexOf(fourthBlock) + 19) : ''),
                extractedFourthData = extractedFourthBlock.replace(fourthBlock, ''),
                fifthBlock = '7EC25',
                extractedFifthBlock = ((data.indexOf(fifthBlock) !== -1) ? data.substring(data.indexOf(fifthBlock), data.indexOf(fifthBlock) + 19) : ''),
                extractedFifthData = extractedFifthBlock.replace(fifthBlock, ''),
                sixthBlock = '7EC26',
                extractedSixthBlock = ((data.indexOf(sixthBlock) !== -1) ? data.substring(data.indexOf(sixthBlock), data.indexOf(sixthBlock) + 19) : ''),
                extractedSixthData = extractedSixthBlock.replace(sixthBlock, '');

            if (extractedFirstData && extractedSecondData && extractedThirdData && extractedFourthData && extractedFifthData && extractedSixthData && extractedSixthData !== '00000000000000') {
                chargingBits = new Array(8 - chargingBits.length + 1).join(0) + chargingBits;
                parsedData = {
                    SOC_BMS: parseInt(extractedFirstData.slice(0, 2), 16) / 2, // first byte within 1st block
                    CHARGING: parseInt(chargingBits.slice(0, 1)), // 7th bit of charging bits
                    RAPID_CHARGE_PORT: parseInt(chargingBits.slice(1, 2)), // 6th bit of charging bits
                    NORMAL_CHARGE_PORT: parseInt(chargingBits.slice(2, 3)), // 5th bit of charging bits,
                    AUX_BATTERY_VOLTAGE: parseInt(extractedFourthData.slice(8, 10), 16) / 10, // 9th + 10th byte within fourth block divided by 10
                    BATTERY_MIN_TEMPERATURE: parseSigned(extractedSecondData.slice(8, 10), 16), // fifth byte within 2nd block
                    BATTERY_MAX_TEMPERATURE: parseSigned(extractedSecondData.slice(6, 8), 16), // fourth byte within 2nd block
                    BATTERY_INLET_TEMPERATURE: parseSigned(extractedThirdData.slice(8, 10), 16), // fifth byte within 3rd block
                    DC_BATTERY_VOLTAGE: ((parseInt(extractedSecondData.slice(2, 4), 16) << 8) + parseInt(extractedSecondData.slice(4, 6), 16)) / 10,
                    DC_BATTERY_CURRENT: parseSigned((extractedFirstData.slice(12, 14) + extractedSecondData.slice(0, 2)), 16) * 0.1,
                    CUMULATIVE_ENERGY_CHARGED: ((
                        (parseInt(extractedFifthBlock.slice(-2), 16) << 24) +
                        (parseInt(extractedSixthData.slice(0, 2), 16) << 16) +
                        (parseInt(extractedSixthData.slice(2, 4), 16) << 8) +
                        (parseInt(extractedSixthData.slice(4, 6), 16))) / 10),
                    CUMULATIVE_ENERGY_DISCHARGED: ((
                        (parseInt(extractedSixthData.slice(6, 8), 16) << 24) +
                        (parseInt(extractedSixthData.slice(8, 10), 16) << 16) +
                        (parseInt(extractedSixthData.slice(10, 12), 16) << 8) +
                        (parseInt(extractedSixthData.slice(12, 14), 16))) / 10)
                }
                parsedData.DC_BATTERY_POWER = parsedData.DC_BATTERY_CURRENT * parsedData.DC_BATTERY_VOLTAGE / 1000
            }
        }
        console.log(parsedData)
    } catch (err) {
        console.error(err);
    }
}