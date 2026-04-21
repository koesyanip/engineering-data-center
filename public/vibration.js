import { ws } from "./ws.js";

// ========================================
// CHART STORAGE
// ========================================
const spectrumCharts = {
  T1: createSpectrumChart("spectrum-T1","Amplitude (m/s²)",0.25),
  T2: createSpectrumChart("spectrum-T2","Amplitude (m/s²)",0.25),
  T3: createSpectrumChart("spectrum-T3","Amplitude (m/s²)",0.25)
};
const spectrumBand = {
  T1: createEnergyChart("specBand-T1",0.25,"Amplitude (m/s²)"),
  T2: createEnergyChart("specBand-T2",0.25,"Amplitude (m/s²)"),
  T3: createEnergyChart("specBand-T3",0.25,"Amplitude (m/s²)")
};
const energyCharts = {
  T1: createEnergyChart("energy-T1",20,"Band Energy (mm/s RMS)"),
  T2: createEnergyChart("energy-T2",20,"Band Energy (mm/s RMS)"),
  T3: createEnergyChart("energy-T3",20,"Band Energy (mm/s RMS)")
};
const waveformCharts = {
  T1: createWaveformChart("waveform-T1"),
  T2: createWaveformChart("waveform-T2"),
  T3: createWaveformChart("waveform-T3")
};
const rmsCharts = {
  T1: createRmsChart("rms-T1",10),
  T2: createRmsChart("rms-T2",10),
  T3: createRmsChart("rms-T3",10)
};

const vortexRmsCharts = {
  T1: createRmsChart("vortex-T1",25),
  T2: createRmsChart("vortex-T2",25),
  T3: createRmsChart("vortex-T3",25)
};

// ========================================
// WEBSOCKET HANDLER
// ========================================
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);

  if (msg.type === "vibration") {
    handleVibration(msg.data);
  }

  if (msg.type === "waveform") {
    handleWaveform(msg.data);
  }
});

// ========================================
// MAIN HANDLER
// ========================================
function handleVibration(dataArray) {
  if (!Array.isArray(dataArray)) return;

  dataArray.forEach(d => {
    if (!d || !d.turbine) return;

    updateTable(d);
    updateSpectrum(d);
    updateSpecBand(d);
    updateEnergy(d);
    handleRmsCharts(d);
    handleVortexRmsCharts(d)
  });
}

// ==========================
// TABLE UPDATE
// ==========================
function updateTable(d) {
  const tbody = document.getElementById(`vibration-${d.turbine}`);
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td><strong>Vibration RMS</strong></td><td class="text-end"></td></tr>

    <tr>
    <td class="ps-3">- Velocity RMS</td>
    <td class="text-end">${d.velocityRMS?.toFixed(2)} mm/s</td>
    </tr>

    <tr>
    <td class="ps-3">- Acceleration RMS</td>
    <td class="text-end">${d.rms?.toFixed(3)} m/s2</td>
    </tr>

    <tr><td><strong>Vibration Spectrum</strong></td><td></td></tr>

    <tr>
    <td class="ps-3">- Rotor Harmonic (273 rpm)</td><td></td>
    </tr>

    <tr>
    <td class="ps-5"> - 1st (4.55 Hz)</td>
    <td class="text-end">${d.amp_1x?.toFixed(3)} m/s2</td>
    </tr>

    <tr>
    <td class="ps-5"> - 2nd (9.10 Hz)</td>
    <td class="text-end">${d.amp_2x?.toFixed(3)} m/s2</td>
    </tr>

    <tr>
    <td class="ps-5"> - 3rd (13.65 Hz)</td>
    <td class="text-end">${d.amp_3x?.toFixed(3)} m/s2</td>
    </tr>

    <tr><td class="ps-3">- Peak Value</td><td></td></tr>

    <tr>
    <td class="ps-5">- Frequency</td>
    <td class="text-end">${d.peakFreq?.toFixed(2)} Hz</td>
    </tr>

    <tr>
    <td class="ps-5">- Value</td>
    <td class="text-end">${d.peakAmp?.toFixed(3)} m/s2</td>
    </tr>

    <tr><td><strong>Energy Band</strong></td><td class="text-end"></td></tr>
    <tr>
    <td class="ps-3">- Vortex Zone Energy (0-2 Hz)</td>
    <td class="text-end">${d.vortexRMS?.toFixed(2)} mm/s</td>
    </tr>

    <tr><td><strong>Load Power</strong></td><td class="text-end"></td></tr>
    <tr>
    <td class="ps-3">- Load</td>
    <td class="text-end">${d.load?.toFixed(2)} kW</td>
    </tr>
    <tr>
    <td class="ps-3">- Power Factor</td>
    <td class="text-end">${d.pf?.toFixed(5)}</td>
    </tr>
  `;
}


// ========================================
// SPECTRUM UPDATE
// ========================================
function updateSpectrum(d) {
  if (!d.spectrum || !Array.isArray(d.spectrum)) return;

  const chart = spectrumCharts[d.turbine];
  if (!chart) return;

  const fftData = d.spectrum.map(item => ({
    x: item.freq,
    y: item.amp
  }));

  chart.data.datasets[0].data = fftData;

  const maxAmp = Math.max(...fftData.map(p => p.y), 1);

  // update tinggi garis order
  for (let i = 1; i <= 3; i++) {
    const freq = chart.data.datasets[i].data[0].x;

    chart.data.datasets[i].data = [
      { x: freq, y: 0 },
      { x: freq, y: maxAmp }
    ];
  }

  chart.update("none");
}


// ========================================
// CREATE SPECTRUM CHART
// ========================================
function createSpectrumChart(canvasId,amp,max) {
  const ctx = document.getElementById(canvasId);

  const RPM = 273;
  const F1X = RPM / 60;
  const F2X = F1X * 2;
  const F3X = F1X * 3;
  //const F05X = F1X / 2;

  return new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        // FFT Spectrum
        {
          label: "FFT",
          data: [],
          borderColor: "rgb(220,53,69)",
          borderWidth: 1,
          pointRadius: 0,
          tension: 0
        },

        //createOrderLine(F05X, "dash"),
        createOrderLine(F1X, "normal"),
        createOrderLine(F2X, "dash"),
        createOrderLine(F3X, "dash")
      ]
    },
    options: {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 105,
          title: {
            display: true,
            text: "Frequency (Hz)"
          },
          ticks: {
            stepSize: 1,
            callback: value => Number(value).toFixed(1)
          }
        },
        y: {
          beginAtZero: true,
          max : max,
          title: {
            display: true,
            text: amp
          }
        }
      }
    },

    // ✅ Inline plugin untuk label kecil
    plugins: [{
      id: "orderLabels",
      afterDraw(chart) {
        const { ctx, scales } = chart;

        const orders = [
          //{ freq: F05X, label: "0.5X" },
          { freq: F1X, label: "1X" },
          { freq: F2X, label: "2X" },
          { freq: F3X, label: "3X" }
        ];

        ctx.save();
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";

        orders.forEach(order => {
          const xPixel = scales.x.getPixelForValue(order.freq);
          const yPixel = scales.y.top + 12;

          ctx.fillText(order.label, xPixel + 3, yPixel);
        });

        ctx.restore();
      },
      id: "vortexZone",
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;

        const xStart = scales.x.getPixelForValue(0);
        const xEnd = scales.x.getPixelForValue(2);

        ctx.save();

        ctx.fillStyle = "rgba(92, 92, 93, 0.15)";
        ctx.fillRect(
          xStart,
          chartArea.top,
          xEnd - xStart,
          chartArea.bottom - chartArea.top
        );

        ctx.fillStyle = "rgba(10, 10, 10, 0.8)";
        //ctx.font = "10px Arial";
        //ctx.fillText("Vortex Zone", xStart + 4, chartArea.top + 12);

        ctx.restore();
      }

    }]
  });
}
function createOrderLine(freq, type) {

  let borderWidth = 1;
  let borderDash = [];

  if (type === "main") {
    borderWidth = 2; // 1X lebih tebal
  }

  if (type === "dash") {
    borderDash = [5, 5]; // 2X & 3X dashed
  }

  return {
    data: [
      { x: freq, y: 0 },
      { x: freq, y: 100 }
    ],
    borderColor: "black",
    borderWidth: borderWidth,
    borderDash: borderDash,
    pointRadius: 0,
    fill: false
  };
}

// ========================================
// UPDATE SPECTRUM BAND CHART
// ========================================
function updateSpecBand(d) {
  if (!d.energyBand) return;

  const chart = spectrumBand[d.turbine];
  if (!chart) return;

  const bandData = [];

  for (let band = 0; band < 110; band++) {
    const key = `${band}-${band + 2}Hz`;
    const value = d.energyBand[key] || 0;

    bandData.push({
      x: band+0.5,   // center of band
      y: value
    });
  }

  chart.data.datasets[0].data = bandData;

  chart.update("none");
}
// ========================================
// UPDATE ENERGY CHART
// ========================================
function updateEnergy(d) {
  if (!d.velocityBand) return;

  const chart = energyCharts[d.turbine];
  if (!chart) return;

  const bandData = [];

  for (let band = 0; band < 110; band++) {
    const key = `${band}-${band + 2}Hz`;
    const value = d.velocityBand[key] || 0;

    bandData.push({
      x: band+0.5,   // center of band
      y: value
    });
  }

  chart.data.datasets[0].data = bandData;

  chart.update("none");
}
// ========================================
// CREATE ENERGY CHART
// ========================================
function createEnergyChart(canvasId, max, title) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: "bar",
    data: {
      datasets: [{
        data: [],
        backgroundColor: "rgba(0,0,0,0.8)",
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 105,
          offset: false,
          title: {
            display: true,
            text: "Frequency Band (Hz)"
          },
          ticks: {
            stepSize: 1,
            callback: value => Number(value).toFixed(0)
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          suggestedMax: max,
          title: {
            display: true,
            text: title
          }
        }
      }
    },
    plugins: [{
      
      id: "vortexZone",
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;

        const xStart = scales.x.getPixelForValue(0);
        const xEnd = scales.x.getPixelForValue(2);

        ctx.save();

        ctx.fillStyle = "rgba(92, 92, 93, 0.15)";
        ctx.fillRect(
          xStart,
          chartArea.top,
          xEnd - xStart,
          chartArea.bottom - chartArea.top
        );

        ctx.fillStyle = "rgba(10, 10, 10, 0.8)";
        ctx.font = "10px Arial";
        ctx.fillText("Vortex Zone", xStart + 4, chartArea.top + 12);

        ctx.restore();
      }

    }]
  });
}

// ========================================
// HANDLE WAVEFORM CHART
// ========================================
function handleWaveform(dataArray) {
  if (!Array.isArray(dataArray)) return;

  dataArray.forEach(d => {
    const chart = waveformCharts[d.turbine];
    if (!chart) return;

    const now = Date.now();

    d.samples.forEach((value, i) => {
      chart.data.datasets[0].data.push({
        x: now + (i * (1000 / d.fs)),
        y: value
      });
    });

    chart.update("none");
  });
}

// ========================================
// CREATE WAVEFORM CHART
// ========================================
function createWaveformChart(canvasId) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{
        label: "Acceleration",
        data: [],
        borderColor: "rgb(0,0,0)",
        borderWidth: 1,
        pointRadius: 0,
        tension: 0
      }]
    },
    options: {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          type: "realtime",
          realtime: {
            duration: 15000,      // tampilkan 15 detik
            refresh: 200,
            delay: 500,
            pause: false
          },
          title: {
            display: true,
            text: "Time"
          }
        },
        y: {
          min: -3,
          max: 3,
          title: {
            display: true,
            text: "Acceleration (m/s²)"
          }
        }
      }
    }
  });
}

// ==========================
// RMS UPDATE CHARTS FUNCTION
// ==========================
function handleRmsCharts(d) {
  const chart = rmsCharts[d.turbine];
  if (!chart) return;

  chart.latestData = {
    rms: d.velocityRMS ?? 0,
    load: d.load ?? 0,
    pf: d.pf ?? 0
  };
}

// ==========================
// VORTEX RMS UPDATE CHARTS FUNCTION
// ==========================
function handleVortexRmsCharts(d) {
  const chart = vortexRmsCharts[d.turbine];
  if (!chart) return;

  chart.latestData = {
    rms: d.vortexRMS ?? 0,
    load: d.load ?? 0,
    pf: d.pf ?? 0
  };
}
// ==========================
// RMS CHARTS FUNCTIONS
// ==========================
function createRmsChart(canvasId, rms) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'RMS',
          yAxisID: 'yRms',
          data: [],
          borderColor: 'black',
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 0
        },
        {
          label: 'Load',
          yAxisID: 'yLoad',
          data: [],
          borderColor: 'rgb(179, 99, 14)',
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 0
        },
        {
          label: 'Power Factor',
          yAxisID: 'yPf',
          data: [],
          borderColor:' rgb(220,53,69)',
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          type: 'realtime',
          realtime: {
            duration: 100000,
            refresh: 2000,
            delay: 2000,
            onRefresh: chart => {
              const now = Date.now();
              if (!chart.latestData) return;

              chart.data.datasets[0].data.push({ x: now, y: chart.latestData.rms });
              chart.data.datasets[1].data.push({ x: now, y: chart.latestData.load });
              chart.data.datasets[2].data.push({ x: now, y: chart.latestData.pf });
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        yRms: {
          position: "left",
          beginAtZero: true,
          suggestedMax: rms,
          title: {
            display: true,
            text: 'Amplitude (mm/s)'
          }
        },
        yLoad: {
          position: 'right',
          min: 4000,
          max: 10000,
          title: {
            display: true,
            text: 'Load kW'
          }
        },
        yPf: {
          position: 'right',
          min: 0.9,
          max: 1,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Power Factor'
          }
        }
      }
    }
  });
}