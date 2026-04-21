const ModbusRTU = require("modbus-serial");

// ==========================
// FLOAT CONVERSION
// ==========================
function readFloat(data, index) {
    const buf = Buffer.alloc(4);
    buf.writeUInt16BE(data[index + 1], 2);
    buf.writeUInt16BE(data[index], 0);
    return buf.readFloatBE();
}

// ==========================
// MODBUS POWER DEVICE CLASS
// ==========================
class ModbusPower {

    constructor(name, ip, slaveId) {

        this.name = name;
        this.ip = ip;
        this.slaveId = slaveId;

        this.client = new ModbusRTU();

        this.connected = false;
        this.isReadingPower = false;
        this.isReadingHarmonic = false;

        this.data = {
            device: name,
            ip: ip
        };

        // prevent crash
        this.client.on("error", (err) => {
            console.error(`Socket error ${this.name}:`, err.message);
            this.connected = false;
        });
    }

    // ==========================
    // CONNECT
    // ==========================
    async connect() {

        if (this.connected) return;

        try {

            if (this.client.isOpen) {
                this.client.close();
            }

            await this.client.connectTCP(this.ip, { port: 502 });

            this.client.setID(this.slaveId);
            this.client.setTimeout(2000);

            this.connected = true;

            console.log(`✅ Connected ${this.name}`);

        } catch (err) {

            console.error(`${this.name} connect failed: ${err.message}`);

            this.connected = false;

            try { this.client.close(); } catch {}

        }
    }

    // ==========================
    // READ POWER (BLOCK READ)
    // ==========================
    async readPower() {

        if (!this.connected || this.isReadingPower) return;

        this.isReadingPower = true;

        try {

            // block 3009 - 3068
            const block1 = await this.client.readHoldingRegisters(3009, 90);

            // block THD current
            const block2 = await this.client.readHoldingRegisters(21299, 10);

            // block THD voltage
            const block3 = await this.client.readHoldingRegisters(21321, 10);

            const d1 = block1.data;
            const d2 = block2.data;
            const d3 = block3.data;

            const voltage = readFloat(d1, 3025 - 3009);
            const current = readFloat(d1, 3009 - 3009);
            const load = readFloat(d1, 3059 - 3009);
            const mvar = readFloat(d1, 3067 - 3009);
            const pf = readFloat(d1, 3083 - 3009);

            const currentthdr = readFloat(d2, 0);
            const currentthds = readFloat(d2, 2);
            const currentthdt = readFloat(d2, 4);

            const thdrs = readFloat(d3, 0);
            const thdst = readFloat(d3, 2);
            const thdrt = readFloat(d3, 4);

            this.data = {
                ...this.data,
                powerts: Date.now(),

                voltage,
                current,
                load,
                mvar,
                pf,

                thdrs,
                thdst,
                thdrt,

                currentthdr,
                currentthds,
                currentthdt
            };

            const turbineMap = {
                "Power-1": "T1",
                "Power-2": "T2",
                "Power-3": "T3"
            };

            const turbine = turbineMap[this.name];

            if (turbine) {
                global.runtimeState.power[turbine] = {
                    ts: Date.now(),
                    load,
                    mvar,
                    pf
                };
            }



        } catch (err) {

            console.error(`Read error ${this.name}:`, err.message);

            this.connected = false;

            if (this.client.isOpen) {
                this.client.close();
            }

        } finally {

            this.isReadingPower = false;

        }
    }

    // ==========================
    // READ HARMONIC (BLOCK READ)
    // ==========================
    async readHarmonic() {

        if (!this.connected || this.isReadingHarmonic) return;

        this.isReadingHarmonic = true;

        try {

            const hrs = await this.client.readHoldingRegisters(21723, 90);
            const hst = await this.client.readHoldingRegisters(22111, 90);
            const hrt = await this.client.readHoldingRegisters(22499, 90);

            const hr = await this.client.readHoldingRegisters(24439, 90);
            const hs = await this.client.readHoldingRegisters(24827, 90);
            const ht = await this.client.readHoldingRegisters(25215, 90);

            const dhrs = hrs.data;
            const dhst = hst.data;
            const dhrt = hrt.data;

            const dhr = hr.data;
            const dhs = hs.data;
            const dht = ht.data;

            this.data = {

                ...this.data,
                harmonicts: Date.now(),

                // =========================
                // VOLTAGE
                // =========================
                hrs3: readFloat(dhrs, 0),
                hrs5: readFloat(dhrs, 12),
                hrs7: readFloat(dhrs, 24),
                hrs11: readFloat(dhrs, 36),
                hrs13: readFloat(dhrs, 48),
                hrs17: readFloat(dhrs, 72),
                hrs19: readFloat(dhrs, 84),

                hst3: readFloat(dhst, 0),
                hst5: readFloat(dhst, 12),
                hst7: readFloat(dhst, 24),
                hst11: readFloat(dhst, 36),
                hst13: readFloat(dhst, 48),
                hst17: readFloat(dhst, 72),
                hst19: readFloat(dhst, 84),

                hrt3: readFloat(dhrt, 0),
                hrt5: readFloat(dhrt, 12),
                hrt7: readFloat(dhrt, 24),
                hrt11: readFloat(dhrt, 36),
                hrt13: readFloat(dhrt, 48),
                hrt17: readFloat(dhrt, 72),
                hrt19: readFloat(dhrt, 84),

                // =========================
                // CURRENT
                // =========================
                hr3: readFloat(dhr, 0),
                hr5: readFloat(dhr, 12),
                hr7: readFloat(dhr, 24),
                hr11: readFloat(dhr, 36),
                hr13: readFloat(dhr, 48),
                hr17: readFloat(dhr, 72),
                hr19: readFloat(dhr, 84),

                hs3: readFloat(dhs, 0),
                hs5: readFloat(dhs, 12),
                hs7: readFloat(dhs, 24),
                hs11: readFloat(dhs, 36),
                hs13: readFloat(dhs, 48),
                hs17: readFloat(dhs, 72),
                hs19: readFloat(dhs, 84),

                ht3: readFloat(dht, 0),
                ht5: readFloat(dht, 12),
                ht7: readFloat(dht, 24),
                ht11: readFloat(dht, 36),
                ht13: readFloat(dht, 48),
                ht17: readFloat(dht, 72),
                ht19: readFloat(dht, 84)
            };

        } catch (err) {

            console.error(`Read Harmonic Error ${this.name}:`, err.message);

            this.connected = false;

            if (this.client.isOpen) {
                this.client.close();
            }

        } finally {

            this.isReadingHarmonic = false;

        }
    }
}

module.exports = { ModbusPower };