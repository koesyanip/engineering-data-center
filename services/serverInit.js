// ==========================
// PACKAGE IMPORT
// ==========================
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

// ==========================
// GLOBAL RUNTIME STATE
// ==========================
global.runtimeState = {
    flow: {
        T1: null,
        T2: null,
        T3: null
    },
    power: {
        T1: null,
        T2: null,
        T3: null
    },
    vibration: {
        T1: null,
        T2: null,
        T3: null
    }
};

// ==========================
// EXPRESS SETUP
// ==========================

const wss = new WebSocket.Server({ port: 8082 });

// ==========================
// MONGODB SETUP
// ==========================
const mongoUrl = 'mongodb://127.0.0.1:27017';
const dbName = 'power_monitoring';

let collections = {};
let mongoClient;
async function connectMongo() {
    mongoClient = new MongoClient(mongoUrl, {
        useUnifiedTopology: true
    });
    await mongoClient.connect();

    const db = mongoClient.db(dbName);

    collections.power = db.collection('power_readings');
    collections.power_1m = db.collection("power_1m");
    collections.power_daily_summary = db.collection("power_daily_summary");
    collections.power_monthly_summary = db.collection("power_monthly_summary");

    collections.harmonic = db.collection('power_harmonic');

    collections.vibration = db.collection('vibration_readings');
    collections.vibration_1m = db.collection("vibration_1m");
    collections.vibration_daily_summary = db.collection("vibration_daily_summary");
    collections.vibration_monthly_summary = db.collection("vibration_monthly_summary");

    collections.flow = db.collection("flow_readings");
    collections.flow_1m = db.collection("flow_1m");
    collections.flow_daily_summary = db.collection("flow_daily_summary");
    collections.flow_monthly_summary = db.collection("flow_monthly_summary");

    // ==========================
    // RAW FLOW INDEX
    // ==========================
    await collections.flow.createIndex(
        { ts: 1 },
        { expireAfterSeconds: 604800 } // 7 hari
    );
    await collections.power.createIndex(
        { ts: 1 },
        { expireAfterSeconds: 7 * 24 * 3600 }
    );
    await collections.vibration.createIndex(
        { ts: 1 },
        { expireAfterSeconds: 7 * 24 * 3600 }
    );
    // ==========================
    // MINUTE DATA INDEX
    // ==========================
    await collections.flow_1m.createIndex({
        turbine: 1,
        ts: -1
    });
    await collections.flow_1m.createIndex({ ts: 1 });
    await collections.power_1m.createIndex({ device: 1, ts: 1 });
    await collections.vibration_1m.createIndex({ turbine: 1, ts: 1 });

    // ==========================
    // DAILY SUMMARY INDEX
    // ==========================

    await collections.flow_daily_summary.createIndex({
        turbine: 1,
        date: -1
    });

    await collections.flow_daily_summary.createIndex({
        date: 1
    });
    await collections.power_daily_summary.createIndex({ device: 1, date: 1 });
    await collections.vibration_daily_summary.createIndex({ turbine: 1, date: 1 });

    // ==========================
    // MONTHLY SUMMARY INDEX
    // ==========================

    await collections.flow_monthly_summary.createIndex({
        turbine: 1,
        year: 1,
        month: 1
    });
    await collections.power_monthly_summary.createIndex({ device: 1, year: 1, month: 1 });
    await collections.vibration_monthly_summary.createIndex({ turbine: 1, year: 1, month: 1 });

    console.log("🍃 MongoDB connected with indexes");

}



const TZ_OFFSET = 8 * 3600 * 1000; // Makassar UTC+8

function toLocal(date) {
  return new Date(new Date(date).getTime() + TZ_OFFSET);
}

function nowLocal() {
  return toLocal(new Date());
}



module.exports = {
    wss,
    collections,
    connectMongo,
    WebSocket,
    nowLocal
};
