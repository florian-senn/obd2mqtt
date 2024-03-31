const mqtt = require("mqtt");
const OBDReader = require('@jstarpl/bluetooth-obd');

let mqttOptions = {
    username: process.env.username,
    password: process.env.password,
}

const client = mqtt.connect(process.env.server, mqttOptions);

let obd = new OBDReader()

console.log(client, obd)

