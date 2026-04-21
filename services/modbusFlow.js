const ModbusRTU = require("modbus-serial");
// ==========================
// PHYSICAL CONSTANT
// ==========================
const RHO = 1000;   // kg/m3
const G   = 9.81;   // m/s2
const BAR_TO_M = 10.197;
const K_LOSS = 0.00546;

// ==========================
// MODBUS FLOW DEVICE (TURBINE 1) CLASS
// ==========================
class ModbusFlow {
    constructor(name, ip, slaveId) {
        this.name = name;
        this.ip = ip;
        this.slaveId = slaveId;
        this.client = new ModbusRTU();
        this.connected = false;
        this.isReading = false;
        this.data = {};
        this.retryCount = 0;
    }

    async connect() {
        try {
            await this.client.connectTCP(this.ip, { port: 502 });
            this.client.setID(this.slaveId);
            this.connected = true;
            this.retryCount = 0;
            console.log(`✅ Connected ${this.name}`);
        } catch (err) {
            this.connected = false;
            this.retryCount++;
            console.log(`❌ ${this.name} connection failed (${this.retryCount})`);
        }
    }

    async readFlow() {
        if (!this.connected || this.isReading) return;

        this.isReading = true;

        try {
            const raw = await this.client.readInputRegisters(100, 2);

            const flow = raw.data[0] / 100;
            const pressureBar = (raw.data[1] / 100)- ((3 - 1.22) * 0.098041);
            const headNet = (pressureBar * BAR_TO_M)+(flow*flow/(2*G*24.095));

            const load = global.runtimeState.power.T1?.load || null;
            const waterPower = RHO * G * flow * headNet / 1000;
            const efficiency = load ? (load / waterPower) * 100 : null;
            const swc = load ? (flow * 3600 / load) : null;

            this.data = {
                turbine: "T1",
                ts: Date.now(),
                flow,
                pressure: pressureBar ,
                head_net: headNet,
                waterpower: waterPower,
                load,
                efficiency,
                swc,
                source: "measured"
            };

            global.runtimeState.flow.T1 = this.data;

        } catch (err) {
            console.log(`⚠️ Read error ${this.name}:`, err.message);

            this.connected = false;

            try {
                this.client.close();
            } catch {}

        } finally {
            this.isReading = false;
        }
    }
}

// ==========================
// ESTIMATION FUNCTION
// ==========================
function estimateFlowFromLoad() {

    const flowT1 = global.runtimeState.flow.T1;
    const p = global.runtimeState.power;

    const Q1 = flowT1.flow;
    const H1 = (flowT1.pressure*BAR_TO_M)+(Q1*Q1/(2*G*24.095));
    const eta1 = flowT1.efficiency / 100;

    if (!eta1 || eta1 < 0.1) return null;

    let H_net = H1;
    let Q2 = 0;
    let Q3 = 0;

    for (let i = 0; i < 4; i++) {
        Q2 = (p.T2.load * 1000) / (eta1 * RHO * G * H_net);
        Q3 = (p.T3.load * 1000) / (eta1 * RHO * G * H_net);

        const Qt = Q1 + Q2 + Q3;
        const H_gross = H1 + K_LOSS * Qt * Qt;
        H_net = H_gross - K_LOSS * Qt * Qt;
    }

    const ts = Date.now();

    // 🔥 UPDATE GLOBAL STATE
    global.runtimeState.flow.T2 = {
        turbine: "T2",
        ts,
        flow: Q2,
        pressure: flowT1.pressure,
        head_net: H_net,
        waterpower: RHO * G * Q2 * H_net / 1000,
        load: p.T2.load,
        efficiency: eta1 * 100,
        swc : p.T2.load > 0 ? Q2*3600/p.T2.load : null,
        source: "estimated"
    };

    global.runtimeState.flow.T3 = {
        turbine: "T3",
        ts,
        flow: Q3,
        pressure: flowT1.pressure,
        head_net: H_net,
        waterpower: RHO * G * Q3 * H_net / 1000,
        load: p.T3.load,
        efficiency: eta1 * 100,
        swc : p.T3.load > 0 ? Q3*3600/p.T3.load : null,
        source: "estimated"
    };

    return true;
}

function buildSummary() {

    const f = global.runtimeState.flow;
    const p = global.runtimeState.power;

    if (!f.T1 || !f.T2 || !f.T3) return null;

    const totalFlow =
        (f.T1.flow || 0) +
        (f.T2.flow || 0) +
        (f.T3.flow || 0);

    const totalLoad =
        (p.T1?.load || 0) +
        (p.T2?.load || 0) +
        (p.T3?.load || 0);

    const hydraulicPower =
        (f.T1.waterpower || 0) +
        (f.T2.waterpower || 0) +
        (f.T3.waterpower || 0);

    const swc = totalLoad > 0
        ? totalFlow *3600/ totalLoad
        : 0;

    return {
        ts: Date.now(),
        totalFlow,
        hydraulicPower,
        totalLoad,
        swc
    };
}
module.exports = {
    ModbusFlow,
    estimateFlowFromLoad,
    buildSummary
};