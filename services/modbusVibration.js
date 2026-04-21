const net = require("net");
const crc = require("crc");
const fft = require("fft-js").fft;
const fftUtil = require("fft-js").util;

class ModbusVibration {
  constructor(name, host, port, slaveId) {
    this.name = name;
    this.host = host;
    this.port = port;
    this.slaveId = slaveId;
    this.socket = null;
    this.buffer = [];
    this.waveformBuffer = [];
    this.connected = false;

    this.SAMPLE_RATE = 210;
    this.FFT_SIZE = 2048;
    this.RPM = 273;
    this.LENGTH = 105;

    this.F1X = this.RPM / 60;
    this.F2X = this.F1X * 2;
    this.F3X = this.F1X * 3;
    this.F05X = this.F1X / 2;
  }
  // =======================
  // CONNECTION FUNCTION
  // =======================
  connect() {

    if (this.connected || this.connecting) return;
    this.connecting = true;

    this.socket = net.createConnection(
      { host: this.host, port: this.port },
      () => {

        console.log(`Vibration ${this.name} connected`);
        this.connected = true;
        this.connecting = false;

      }
    );

    this.socket.setTimeout(5000);
    this.socket.on("data", (data) => {
      this.decodeResponse(data);
    });

    this.socket.on("error", (err) => {

      console.error(`Socket error ${this.name}:`, err.message);
      this.connected = false;
      this.connecting = false;

      if (this.socket) this.socket.destroy();

    });

    this.socket.on("timeout", () => {

      console.log(`Socket timeout ${this.name}`);
      this.connected = false;
      this.connecting = false;

      if (this.socket) this.socket.destroy();

    });

    this.socket.on("close", () => {

      console.log(`Reconnecting ${this.name} in 5s`);
      this.connected = false;
      this.connecting = false;

      if (this.reconnectTimer) return;

      this.reconnectTimer = setTimeout(() => {

        this.reconnectTimer = null;
        this.connect();

      }, 5000);

    });

  } 
  // =======================
  // VIBRATION POLLING FUNCTION
  // =======================
  startPolling() {
    setInterval(() => {
      if (!this.connected) return;
      this.socket.write(this.buildRequest());
    }, 1000/this.SAMPLE_RATE);
  }
  // =======================
  // MODBUS REQUEST FUNCTION
  // =======================
  buildRequest() {
    const buf = Buffer.alloc(6);
    buf.writeUInt8(this.slaveId, 0);
    buf.writeUInt8(0x03, 1);
    buf.writeUInt16BE(0x0036, 2);
    buf.writeUInt16BE(0x0001, 4);

    const crcVal = crc.crc16modbus(buf);
    const crcBuf = Buffer.alloc(2);
    crcBuf.writeUInt16LE(crcVal);

    return Buffer.concat([buf, crcBuf]);
  }
  // =======================
  // MODBUS DECODE DATA FUNCTION
  // =======================
  decodeResponse(data) {
    if (data.length < 5) return;

    const withoutCRC = data.slice(0, -2);
    const recvCRC = data.readUInt16LE(data.length - 2);
    const calcCRC = crc.crc16modbus(withoutCRC);

    if (recvCRC !== calcCRC) return;

    const raw = data.readInt16BE(3);
    const acc = (raw / 32768) * 16 * 9.81;

    this.buffer.push(acc);
    //console.log("buffer:", this.buffer.length);
    this.waveformBuffer.push(acc); // <-- tambahan
    

    if (this.buffer.length >= this.FFT_SIZE) {
      this.processFFT();
    }
    //console.log("RAW:", data);
  }

  // =======================
  // VIBRATION FFT FUNCTION
  // =======================
  processFFT() {
    const N = this.FFT_SIZE;
    // =======================
    // ACCELERATION RMS
    // =======================
    const rms = Math.sqrt(
      this.buffer.reduce((sum, v) => sum + v * v, 0) / N
    );

    const mean = this.buffer.reduce((a, b) => a + b, 0) / N;
    const centered = this.buffer.map(v => v - mean);

    // =======================
    // HANNING WINDOW
    // =======================
    const windowed = centered.map((v, i) => {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      return v * w;
    });

    const phasors = fft(windowed);

    const rawMag = fftUtil.fftMag(phasors);
    const scaledMag = rawMag.map(m => (4 * m) / N);
    const frequencies = fftUtil.fftFreq(phasors, this.SAMPLE_RATE);
    

    const half = scaledMag.slice(0, N / 2);
    const halfFreq = frequencies.slice(0, N / 2);

    const velocityMag = scaledMag.map((amp, i) => {
      const f = frequencies[i];
      if (f <0.1) return 0; // hindari divide by zero
      return amp / (2 * Math.PI * f);
    });
    const velocityHalf = velocityMag.slice(0, N / 2);

    // =======================
    // VELOCITY RMS
    // =======================
    const df = this.SAMPLE_RATE / N;
    let vSumSq = 0;
    for (let i = 1; i < velocityHalf.length; i++) {
      const f = halfFreq[i];
      if (f < 2 || f > this.LENGTH) continue;
      const vrms = velocityHalf[i] / Math.sqrt(2);
      vSumSq += (vrms * vrms) * df;
    }
    const WINDOW_RMS_CORR = Math.sqrt(1.5); // 1.225
    const velocityRMS = Math.sqrt(vSumSq) * WINDOW_RMS_CORR * 1000;

    // ======================================
    // VORTEX ZONE ENERGY (0.3 – 2 Hz)
    // ======================================
    let vortexSumSq = 0;

    for (let i = 1; i < velocityHalf.length; i++) {
      const f = halfFreq[i];
      if (f >= 0.1 && f <= 2) {
        const vrms = velocityHalf[i] / Math.sqrt(2);
        vortexSumSq += (vrms * vrms) * df;
      }
    }
    const vortexRMS = Math.sqrt(vortexSumSq) * WINDOW_RMS_CORR * 1000; // mm/s

    // ==============================
    // ENERGY BAND 1 Hz (0–105 Hz)
    // ==============================
    const energyBand = {};
    const energyBandWidth = 2;

    for (let bandStart = 0; bandStart < this.LENGTH; bandStart += energyBandWidth) {

      let sumSq = 0;
      const bandEnd = bandStart + energyBandWidth;

      for (let i = 0; i < halfFreq.length; i++) {
        const f = halfFreq[i];

        if (f >= bandStart && f < bandEnd) {
          sumSq += (half[i] * half[i]) * df;
        }
      }

      energyBand[`${bandStart}-${bandEnd}Hz`] =
        Number(Math.sqrt(sumSq).toFixed(4));
    }

    const findNear = (target) => {
      let idx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < halfFreq.length; i++) {
        const diff = Math.abs(halfFreq[i] - target);
        if (diff < minDiff) {
          minDiff = diff;
          idx = i;
        }
      }
      return half[idx];
    };
    // ==============================
    // VELOCITY BAND 5 Hz (0–105 Hz)
    // ==============================
    const velocityBand = {};
    const BAND_WIDTH = 2;

    for (let bandStart = 0; bandStart < this.LENGTH; bandStart += BAND_WIDTH) {

        let sumSqInBand = 0;
        const bandEnd = bandStart + BAND_WIDTH;

        for (let i = 1; i < velocityHalf.length; i++) {
            const f = halfFreq[i];

            if (f >= bandStart && f < bandEnd && f >= 0.1) {
                const vrms = velocityHalf[i] / Math.sqrt(2);
                sumSqInBand += (vrms * vrms) * df;
            }
        }

        velocityBand[`${bandStart}-${bandEnd}Hz`] =
            Number((Math.sqrt(sumSqInBand) * 1000).toFixed(4));
    } 
    
    // =======================
    // VIBRATION SPECTRUM
    // =======================
    const spectrum = [];
    for (let i = 0; i < halfFreq.length; i++) {
      if (halfFreq[i] <= this.LENGTH) {

        spectrum.push({
          freq: Number(halfFreq[i].toFixed(2)),
          amp: Number(half[i].toFixed(4))
        });

      }
    }


    // =======================
    // VIBRATION SPECTRUM PEAK VALUE
    // =======================
    let peakAmp = 0;
    let peakFreq = 0;

    for (let i = 2; i < half.length; i++) {
      if (halfFreq[i] < 2) continue; // skip <2 Hz

      if (half[i] > peakAmp) {
        peakAmp = half[i];
        peakFreq = halfFreq[i];
      }
    }
    
    // =======================
    // VIBRATION RESULT
    // =======================
    const result = {
      device: this.name,
      ts: new Date(),
      rms,
      velocityRMS,
      vortexRMS,
      amp_05x: findNear(this.F05X),
      amp_1x: findNear(this.F1X),
      amp_2x: findNear(this.F2X),
      amp_3x: findNear(this.F3X),
      peakFreq,
      peakAmp,
      spectrum,
      energyBand,
      velocityBand
    };

    // =======================
    // VIRATION FFT SMOOTHING
    // =======================
    const SHIFT = 64;
    if (this.buffer && this.buffer.length > SHIFT) {
      this.buffer = this.buffer.slice(SHIFT);
    } else {
      this.buffer = [];
    }

    if (this.onData) {
      this.onData(result);
    }
  }
  // =======================
  // VIBRATION RAW DATA FUNCTION
  // =======================
  getWaveform() {
    if (!this.waveformBuffer.length) return null;

    const step = 10; // downsample factor
    const reduced = [];

    for (let i = 0; i < this.waveformBuffer.length; i += step) {
      reduced.push(this.waveformBuffer[i]);
    }

    const data = {
      device: this.name,
      ts: new Date(),
      fs: this.SAMPLE_RATE / step, // ⚠️ penting!
      samples: reduced
    };

    this.waveformBuffer = [];

    return data;
  }
}

module.exports = { ModbusVibration };