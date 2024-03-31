# obd2mqtt

obd2 gateway to mqtt/influxDB

goal: run gateway on a small low energy device (esp32? with 5g|wifi|?) and centralized data (BEV battery data!)

first test vehicle: Hyundai IONIQ 6

steps:
Car -OBD2-> OBD2/BLE-Dongle -BT-> Relay Device -MQTT-> Broker -MQTT-> influxDB
                                               -HTTP-> influxDB (to avoid unnecessary conversion steps)

connect Serial via Bluetooth -> request and parse OBD2 data -> publish via MQTT

"bluetooth-serial-port": "^3.0.2" for bluetooth-serial protocol, stable and reliable

generic OBD2 profiles aren't specific enough for Hyundai EVs,
<https://github.com/greenenergyprojects/obd2-gateway/blob/master/server/test.ts>
<https://github.com/EVNotify/EVNotify/blob/f87449c7fdf4fe868c48c0bec13a5df62b8f22b5/app/www/components/cars/IONIQ_BEV.vue>
-> these provide first approaches

"mqtt": "^5.5.0" for mqtt protocol, stable and reliable
"@influxdata/influxdb-client": "^1.33.2", stable and reliable, yet not implemented

TODO: split code into functional chunks, remove demo/test code; design general approach to parser (interface?)
