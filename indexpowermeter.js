// =====================================================
// PACKAGE IMPORT
// =====================================================
const express = require("express");
const path = require("path");
const { ModbusPower } = require("./services/modbusPower");
const { ModbusFlow, estimateFlowFromLoad, buildSummary } = require("./services/modbusFlow");
const { ModbusVibration } = require("./services/modbusVibration");
const { wss, collections, connectMongo, WebSocket,nowLocal } = require("./services/serverInit");
const { summarizeMinute,summarizeDaily, summarizeMonthly } = require("./services/flowSumData");
const { summarizePowerMinute,summarizePowerDaily, summarizePowerMonthly } = require("./services/powerSumData");
const { summarizeVibrationMinute,summarizeVibrationDaily, summarizeVibrationMonthly } = require("./services/vibrationSumData");
const flowSummaryRoute = require("./routes/flowSummary");
const powerSummaryRoute = require("./routes/powerSummary");

// =====================================================
// EXPRESS SETUP
// =====================================================
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", flowSummaryRoute);
app.use("/api", powerSummaryRoute);

const port = 3000;
connectMongo().catch(console.error);

// =====================================================
// WEBSOCKET
// =====================================================
wss.on("connection", () => {
  console.log("🔌 WebSocket client connected");
});

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });

  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// =====================================================
// DEVICE CONFIG
// =====================================================
const devices = [
  new ModbusPower("Power-1", "192.168.1.54", 1),
  new ModbusPower("Power-2", "192.168.1.64", 1),
  new ModbusPower("Power-3", "192.168.1.74", 3)
];

const flowmeters = [
  new ModbusFlow("Flow-1", "192.168.1.41", 1)
];

const vibrations = [
  new ModbusVibration("T2", "192.168.1.173", 23, 0x10),
  new ModbusVibration("T1", "192.168.1.163", 23, 0x30),
  //new ModbusVibration("T3", "192.168.1.173", 27001, 0x30)
];

let powerBuffer = [];
let flowBuffer = [];
let vibrationBuffer = [];
const lastFlowTimestamp = {};

// =====================================================
// INIT CONNECT
// =====================================================
async function init() {
  for (const d of devices) await d.connect();
  for (const f of flowmeters) await f.connect();
  for (const v of vibrations) {
    await v.connect();
    v.startPolling();
  }
}
init();

// =====================================================
// VIBRATION HANDLER
// =====================================================
for (const v of vibrations) {
  v.onData = async (data) => {
    if (!data) return;

    try {
      const turbine = v.name;

      const payload = {
        turbine,
        ts: data.ts,
        localtime: nowLocal(),
        rms: data.rms,
        velocityRMS: data.velocityRMS,
        vortexRMS : data.vortexRMS,
        amp_05x: data.amp_05x,
        amp_1x: data.amp_1x,
        amp_2x: data.amp_2x,
        amp_3x: data.amp_3x,
        peakFreq: data.peakFreq,
        peakAmp: data.peakAmp,
        spectrum: data.spectrum,
        energyBand: data.energyBand,
        velocityBand: data.velocityBand,
        
      };

      const mongodata = {
        turbine,
        ts: data.ts,
        localtime: nowLocal(),
        rms: data.rms,
        velocityRMS: data.velocityRMS,
        vortexRMS : data.vortexRMS,
        amp_05x: data.amp_05x,
        amp_1x: data.amp_1x,
        amp_2x: data.amp_2x,
        amp_3x: data.amp_3x,
        peakFreq: data.peakFreq,
        peakAmp: data.peakAmp,
        energyBand: data.energyBand
      };

      global.runtimeState.vibration[turbine] = payload;
      vibrationBuffer.push(mongodata);

    } catch (err) {
      console.error("Vibration handler error:", err.message);
    }
  };  
}
// =====================================================
// VIBRATION BROADCAST (1s)
// =====================================================
setInterval(() => {
  try {
    const vibState = global.runtimeState?.vibration;
    const powerState = global.runtimeState?.power;
    if (!vibState) return;
    const turbines = ["T1", "T2", "T3"];
    const payload = turbines.map(t => {
      const vib = vibState[t];
      if (!vib) return null;
      const load = powerState?.[t]?.load ?? null;
      const pf = powerState?.[t]?.pf ?? null;
      return {
        ...vib,
        load,   // 🔥 inject load ke vibration data
        pf
      };

    }).filter(Boolean);

    broadcast("vibration", payload);

  } catch (err) {
    console.error("Broadcast vibration error:", err.message);
  }
}, 1000);
// =====================================================
// WAVEFORM BROADCAST (0.5s)
// =====================================================
setInterval(() => {
  try {
    const waveformPayload = [];
    for (const v of vibrations) {
      const wf = v.getWaveform();
      if (!wf) continue;

      waveformPayload.push({
        turbine: v.name,
        ts: wf.ts,
        fs: wf.fs,
        samples: wf.samples
      });
    }
    if (waveformPayload.length > 0) {
      broadcast("waveform", waveformPayload);
    }
  } catch (err) {
    console.error("Waveform broadcast error:", err.message);
  }
}, 2000);
// =====================================================
// POWER LOOP (1s)
// =====================================================
setInterval(async () => {
  for (const d of devices) {
    try {
      if (!d.connected) await d.connect();

      await d.readPower();
      if (!d.data || !collections.power) continue;

      powerBuffer.push({
        device: d.data.device,
        ip: d.data.ip,
        ts: new Date(d.data.powerts),
        localtime: nowLocal(),
        voltage: d.data.voltage,
        current: d.data.current,
        thdrs: d.data.thdrs,
        thdst: d.data.thdst,
        thdrt: d.data.thdrt,
        currentthdr: d.data.currentthdr,
        currentthds: d.data.currentthds,
        currentthdt: d.data.currentthdt,
        load: d.data.load,
        mvar: d.data.mvar
      });

      broadcast("power", d.data);

    } catch (err) {
      console.error("Power loop error:", err.message);
    }
  }
}, 1000);

// =====================================================
// HARMONIC LOOP (60s)
// =====================================================
setInterval(async () => {
  for (const d of devices) {
    try {
      if (!d.connected) await d.connect();

      await d.readHarmonic();
      if (!d.data || !collections.harmonic) continue;

      await collections.harmonic.insertOne({
      device: d.data.device,
      ip: d.data.ip,
      ts: new Date(d.data.harmonicts),
      localtime: nowLocal(),

      // ======================
      // VOLTAGE
      // ======================
      hrs3: d.data.hrs3,
      hrs5: d.data.hrs5,
      hrs7: d.data.hrs7,
      hrs11: d.data.hrs11,
      hrs13: d.data.hrs13,
      hrs17: d.data.hrs17,
      hrs19: d.data.hrs19,

      hrt3: d.data.hrt3,
      hrt5: d.data.hrt5,
      hrt7: d.data.hrt7,
      hrt11: d.data.hrt11,
      hrt13: d.data.hrt13,
      hrt17: d.data.hrt17,
      hrt19: d.data.hrt19,

      hst3: d.data.hst3,
      hst5: d.data.hst5,
      hst7: d.data.hst7,
      hst11: d.data.hst11,
      hst13: d.data.hst13,
      hst17: d.data.hst17,
      hst19: d.data.hst19,

      // ======================
      // CURRENT
      // ======================
      hr3: d.data.hr3,
      hr5: d.data.hr5,
      hr7: d.data.hr7,
      hr11: d.data.hr11,
      hr13: d.data.hr13,
      hr17: d.data.hr17,
      hr19: d.data.hr19,

      hs3: d.data.hs3,
      hs5: d.data.hs5,
      hs7: d.data.hs7,
      hs11: d.data.hs11,
      hs13: d.data.hs13,
      hs17: d.data.hs17,
      hs19: d.data.hs19,

      ht3: d.data.ht3,
      ht5: d.data.ht5,
      ht7: d.data.ht7,
      ht11: d.data.ht11,
      ht13: d.data.ht13,
      ht17: d.data.ht17,
      ht19: d.data.ht19,
    });

    broadcast("harmonic", d.data);

    } catch (err) {
      console.error("Harmonic loop error:", err.message);
    }
  }
}, 2000);

// =====================================================
// FLOW READ LOOP (1s)
// =====================================================
setInterval(async () => {
  for (const f of flowmeters) {
    try {
      if (!f.connected) await f.connect();
      await f.readFlow();
    } catch (err) {
      console.error("Flow read error:", err.message);
    }
  }
}, 1000);

// =====================================================
// ESTIMATION LOOP (1s)
// =====================================================
setInterval(() => {
  try {
    const updated = estimateFlowFromLoad();
    if (!updated) return;

    const flowState = global.runtimeState?.flow;
    if (!flowState) return;
  } catch (err) {
    console.error("Estimation error:", err.message);
  }
}, 1000);

// =====================================================
// BROADCAST LOOP (1s)
// =====================================================
setInterval(() => {
  broadcast("turbine", [
    global.runtimeState.flow.T1,
    global.runtimeState.flow.T2,
    global.runtimeState.flow.T3
  ]);
}, 1000);

// =====================================================
// SAVE FLOW TO BUFFER (1s)
// =====================================================

setInterval(async () => {
  try {
    const flowState = global.runtimeState?.flow;
    if (!flowState || !collections.flow) return;

    const now = new Date();
    const nowMs = now.getTime();

    const docs = Object.values(flowState)
      .filter(t => t?.turbine)
      .map(t => {

        let deltaTime = 1;

        if (lastFlowTimestamp[t.turbine]) {
          deltaTime = (nowMs - lastFlowTimestamp[t.turbine]) / 1000;
        }

        lastFlowTimestamp[t.turbine] = nowMs;

        const volume = (t.flow || 0) * deltaTime;
        //console.log("volume: " + volume);

        return {
          turbine: t.turbine,
          ts: now,

          flow: t.flow,
          volume: volume,          // <-- volume m³ selama interval ini

          pressure: t.pressure,
          nethead: t.head_net,
          waterpower: t.waterpower,
          load: t.load,
          efficiency: t.efficiency,
          swc: t.swc,

          source: t.source
        };
      });

    if (docs.length > 0) {
      flowBuffer.push(...docs);
    }

  } catch (err) {
    console.error("Flow save error:", err.message);
  }
}, 1000);
// =====================================================
// BATCH DATA TO MONGO (10s)
// =====================================================
setInterval(async () => {
  try {

    if (powerBuffer.length > 0 && collections.power) {
      await collections.power.insertMany(powerBuffer);
      powerBuffer = [];
    }

    if (flowBuffer.length > 0 && collections.flow) {
      await collections.flow.insertMany(flowBuffer);
      flowBuffer = [];
    }
    if (vibrationBuffer.length > 0 && collections.vibration) {
      await collections.vibration.insertMany(vibrationBuffer);
      vibrationBuffer = [];
    }

  } catch (err) {
    console.error("Mongo flush error:", err.message);
  }
}, 10000);

// =====================================================
// SUMMARY LOOP (1s)
// =====================================================
setInterval(() => {
  try {
    const summary = buildSummary();
    if (summary) broadcast("summary", summary);
  } catch (err) {
    console.error("Summary error:", err.message);
  }
}, 1000);

// =====================================================
// AUTO DAILY + MONTHLY AGGREGATION (10s)
// =====================================================
// =====================================
// MINUTE SUMMARYs
// =====================================
setInterval(async () => {
  try {
    await summarizeMinute();
    await summarizePowerMinute();
    await summarizeVibrationMinute();
  } catch (err) {
    console.error("Minute summary error:", err.message);
  }
}, 60000);


// =====================================
// DAILY SUMMARY
// =====================================
setInterval(async () => {
  try {
    await summarizeDaily();
    await summarizePowerDaily();
    await summarizeVibrationDaily();
  } catch (err) {
    console.error("Daily summary error:", err.message);
  }
}, 60000);


// =====================================
// MONTHLY SUMMARY
// =====================================
setInterval(async () => {
  try {
    await summarizeMonthly();
    await summarizePowerMonthly();
    await summarizeVibrationMonthly();
  } catch (err) {
    console.error("Monthly summary error:", err.message);
  }
}, 3600000);
// =====================================================
// EXPRESS ROUTES
// =====================================================
app.get("/", (req, res) => res.render("index"));
app.get("/flow", (req, res) => res.render("flow"));
app.get("/vibration", (req, res) => res.render("vibration"));



// =====================================================
// START SERVER
// =====================================================
app.listen(port, () => {
  console.log(`🌐 Web server running on port ${port}`);
});