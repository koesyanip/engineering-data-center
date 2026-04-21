import { ws } from "./ws.js";

// ==========================
// CHARTS CANVAS
// ==========================
const flowCharts = {
  "T1": createFlowChart("timeseries-T1"),
  "T2": createFlowChart("timeseries-T2"),
  "T3": createFlowChart("timeseries-T3")
};

const loadCharts = {
  "T1": createLoadChart("load-T1"),
  "T2": createLoadChart("load-T2"),
  "T3": createLoadChart("load-T3")
};

const efficiencyChart = {
  "T1": createEfficiencyScatter("eff-T1"),
  "T2": createEfficiencyScatter("eff-T2"),
  "T3": createEfficiencyScatter("eff-T3")
};

const flowScatterChart = {
  "T1": createFlowScatter("flowScatt-T1"),
  "T2": createFlowScatter("flowScatt-T2"),
  "T3": createFlowScatter("flowScatt-T3")
};

const historyCharts = {};


// ==========================
// WEB SOCKET HANDLER
// ==========================
ws.addEventListener("message", e => {
  const msg = JSON.parse(e.data);

  if (msg.type === "turbine") {
    const turbines = msg.data;

    Object.values(turbines).forEach(d => {
      if (!d) return;

      updateFlow(d);
      updateTable(d);
      updateLoadChart(d);
      updateEfficiencyScatter(d);
      updateFlowScatter(d);

    });
  }
  if (msg.type === "summary") {
    updateSummary(msg.data);
  }
});


// ==========================
// TABLE CANVAS
// ==========================
function updateTable(d) {
  const tbody = document.getElementById(`turbine-${d.turbine}`);
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td>Discharge Flowrate (Q)</td><td style="text-align:right">${d.flow?.toFixed(2)} m3/s</td></tr>
    <tr><td>Net Head (h)</td><td style="text-align:right">${d.head_net?.toFixed(2)} m</td></tr>
    <tr><td>Water Pressure (p)</td><td style="text-align:right">${d.pressure?.toFixed(2)} Bar</td></tr>
    <tr><td>Water Power (P0)</td><td style="text-align:right">${d.waterpower?.toFixed(2)} kW</td></tr>
    <tr><td>Load Power (P)</td><td style="text-align:right">${d.load?.toFixed(2)} kW</td></tr>
    <tr><td>Turbine Efficiency (n)</td><td style="text-align:right">${d.efficiency?.toFixed(2)} %</td></tr>
    <tr><td>Specific Water Consumption (SWC)</td><td style="text-align:right">${d.swc?.toFixed(2)} m3/kWh</td></tr>
    <tr><td>Source </td><td style="text-align:right"><strong>${d.source}</strong></td></tr>
  `;
  
}


// ==========================
// CHARTS UPDATE FUNCTION
// ==========================
function updateFlow(d) {
  const chart = flowCharts[d.turbine];
  if (!chart) return;

  chart.latestData = {
    ts: d.ts,
    flow: d.flow
  };
}
function updateSummary(d) {
  if (!d) return;

  document.getElementById("totalFlowValue").innerText =
    d.totalFlow.toFixed(2) + " m³/s";

  // document.getElementById("hydraulicPowerValue").innerText =
  //   d.hydraulicPower.toFixed(0) + " kW";

  document.getElementById("totalLoadValue").innerText =
    d.totalLoad.toFixed(0) + " kW";

  document.getElementById("swcValue").innerText =
    d.swc.toFixed(2) + " m³/kWh";
}


// ==========================
// FLOW CHARTS FUNCTION
// ==========================
function createFlowChart(canvasId) {
  const ctx = document.getElementById(canvasId);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Discharge Flow (m³/s)',
        data: [],
        backgroundColor:'rgba(75,192,192,0.2)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 2,
        tension: 0.2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: 'realtime',
          realtime: {
            duration: 30000,
            refresh: 1000,
            delay: 3000,
            onRefresh: chart => {
              if (!chart.latestData) return;

              chart.data.datasets[0].data.push({
                x: chart.latestData.ts,
                y: chart.latestData.flow
              });
            }
          }
        },
        y: {
          min: 0,
          max: 35,
          title: {
            display: true,
            text: 'Flow (m³/s)'
          }
        }
      }
    }
  });

  return chart;
}
function updateLoadChart(d) {
  const chart = loadCharts[d.turbine];
  if (!chart) return;

  chart.latestData = {
    ts: d.ts,
    waterPower: d.waterpower,
    loadPower: d.load
  };
}


// ==========================
// POWER CHARTS CANVAS
// ==========================
function createLoadChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Water Power P₀ (kW)',
          data: [],
          borderColor: 'rgba(253, 157, 13, 1)',
          backgroundColor: 'rgba(253,157,13,0.15)',
          borderWidth: 2,
          tension: 0.2,
          fill: true
        },
        {
          label: 'Load Power P (kW)',
          data: [],
          borderColor: 'rgba(220,53,69,1)',
          backgroundColor: 'rgba(220,53,69,0.5)',
          borderWidth: 2,
          tension: 0.2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: 'realtime',
          realtime: {
            duration: 30000,
            refresh: 1000,
            delay: 3000,
            onRefresh: chart => {
              if (!chart.latestData) return;

              chart.data.datasets[0].data.push({
                x: chart.latestData.ts,
                y: chart.latestData.waterPower
              });

              chart.data.datasets[1].data.push({
                x: chart.latestData.ts,
                y: chart.latestData.loadPower
              });
            }
          }
        },
        y: {
          min: 0,
          suggestedMax: 12000,
          title: {
            display: true,
            text: 'Power (kW)'
          }
        }
      }
    }
  });

  return chart;
}

// ==========================
// HISTORY BAR CHARTS
// ==========================
async function loadHistory(turbine) {
  const selectElement = document.getElementById(`typeSelect-${turbine}`);
  if (!selectElement) return;
  
  const type = selectElement.value;

  try {
    const res = await fetch(`/api/flow-summary?type=${type}&turbine=${turbine}`);
    if (!res.ok) throw new Error("Failed to fetch data");
    
    const data = await res.json();

    // Mapping data for charts
    const labels = data.map(d => 
      type === "daily" ? new Date(d.date).toLocaleDateString() : `${d.month}/${d.year}`
    );

    // Update Water Consumption Chart
    createOrUpdateHistoryChart(
      `flowhistory-${turbine}`, 
      `${turbine}-flow`, 
      labels, 
      [{ 
        label: "Water Consumption (m³)", 
        data: data.map(d => d.sumFlow || 0),
        backgroundColor:'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)'
      }],'bar'
    );

    // Update Power Load Chart
    createOrUpdateHistoryChart(
      `loadhistory-${turbine}`, 
      `${turbine}-power`, 
      labels, 
      [
        { 
          label: "Avg Load Power (kW)", 
          data: data.map(d => d.avgLoad || 0),
          borderColor: 'rgba(220,53,69,1)',
          backgroundColor: 'rgba(220,53,69,1)'
        },
        { 
          label: "Avg Water Power (kW)", 
          data: data.map(d => d.avgWaterPower || 0),
          borderColor: 'rgba(253, 157, 13, 1)',
          backgroundColor: 'rgba(253,157,13,1)'
        }
      ],'line'
    );
  } catch (err) {
    console.error(`Error loading history for ${turbine}:`, err);
  }
}

function createOrUpdateHistoryChart(canvasId, chartKey, labels, datasets, type) {
  // Use the unique chartKey to track instances
  if (historyCharts[chartKey]) {
    historyCharts[chartKey].destroy();
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas element #${canvasId} not found.`);
    return;
  }

  const ctx = canvas.getContext('2d');
  historyCharts[chartKey] = new Chart(ctx, {
    type: type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Better for dashboard layouts
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
// ==========================
// INIT HISTORY CHARTS
// ==========================
["T1", "T2", "T3"].forEach(turbine => {

  // Load pertama kali saat page dibuka
  loadHistory(turbine);

  // Reload saat dropdown berubah
  const select = document.getElementById(`typeSelect-${turbine}`);
  if (select) {
    select.addEventListener("change", () => {
      loadHistory(turbine);
    });
  }

});
// ==========================
// EFFICIENCY CHART
// ==========================
function updateEfficiencyScatter(d) {

  if (d.load == null || d.efficiency == null) return;

  const chart = efficiencyChart[d.turbine];
  if (!chart) return;

  chart.data.datasets[1].data.push({
    x: d.load,
    y: d.efficiency
  });

  if (chart.data.datasets[1].data.length > 200) {
    chart.data.datasets[1].data.shift();
  }

  chart.update();
}


function createEfficiencyScatter(canvasId) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Commissioning (TMA : 60.49m)',
          data: [
            { x: 2059, y: 58.28 },
            { x: 3015, y: 65.20 },
            { x: 4065, y: 71.31 },
            { x: 5115, y: 77.75 },
            { x: 6060, y: 80.62 },
            { x: 6979, y: 83.72 },
            { x: 8100, y: 85.83 },
            { x: 9000, y: 87.67 },
            { x: 10078, y: 89.52 }
          ],
          borderColor: 'rgb(1, 20, 20)' ,
          backgroundColor: 'rgba(1, 20, 20, 0.5)',
          showLine: true,   // supaya jadi kurva
          tension: 0.2
        },
        {
          label: 'Realtime',
          data: [],
          borderColor: 'rgb(178, 14, 148)' ,
          backgroundColor: 'rgba(178, 14, 148, 0.5)',
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Load (kW)'
          }
        },
        y: {
          min: 50,
          max: 95,
          title: {
            display: true,
            text: 'Efficiency (%)'
          }
        }
      }
    }
  });
}

// ==========================
// FLOW LOAD SCATTER CHART
// ==========================
function updateFlowScatter(d) {

  if (d.load == null || d.flow == null) return;

  const chart = flowScatterChart[d.turbine];
  if (!chart) return;

  chart.data.datasets[1].data.push({
    x: d.load,
    y: d.flow
  });

  if (chart.data.datasets[1].data.length > 200) {
    chart.data.datasets[1].data.shift();
  }

  chart.update();
}


function createFlowScatter(canvasId) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Commissioning (TMA : 60.49m)',
          data: [
            { x: 2059, y: 7.86 },
            { x: 3015, y: 10.25 },
            { x: 4065, y: 12.73 },
            { x: 5115, y: 14.73 },
            { x: 6060, y: 16.96 },
            { x: 6979, y: 18.75 },
            { x: 8100, y: 21.32 },
            { x: 9000, y: 23.23 },
            { x: 10078, y: 25.39 }
          ],
          borderColor: 'rgb(1, 20, 20)' ,
          backgroundColor: 'rgba(1, 20, 20, 0.5)',
          showLine: true,   // supaya jadi kurva
          tension: 0.2
        },
        {
          label: 'Realtime',
          data: [],
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)',
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Load (kW)'
          }
        },
        y: {
          min: 0,
          max: 35,
          title: {
            display: true,
            text: 'Flow (m3/s)'
          }
        }
      }
    }
  });
}

