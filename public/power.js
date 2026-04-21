import { ws } from "./ws.js";

// ==========================
// CHARTS CANVAS
// ==========================
const loadCharts = {
  "Power-1": createThdLoadChart("timeseries-Power-1", 'THD R-S (%)','THD S-T (%)','THD R-T (%)'),
  "Power-2": createThdLoadChart("timeseries-Power-2", 'THD R-S (%)','THD S-T (%)','THD R-T (%)'),
  "Power-3": createThdLoadChart("timeseries-Power-3", 'THD R-S (%)','THD S-T (%)','THD R-T (%)')
};
const currentCharts = {
  "Power-1": createThdLoadChart("timeseries-Current-1",'THD R (%)','THD S (%)','THD T (%)'),
  "Power-2": createThdLoadChart("timeseries-Current-2",'THD R (%)','THD S (%)','THD T (%)'),
  "Power-3": createThdLoadChart("timeseries-Current-3",'THD R (%)','THD S (%)','THD T (%)')
};
const harmonicVoltageChart = {
  "Power-1": createHarmonicChart("harmonic-Voltage-1"),
  "Power-2": createHarmonicChart("harmonic-Voltage-2"),
  "Power-3": createHarmonicChart("harmonic-Voltage-3")
};
const harmonicCurrentChart = {
  "Power-1": createHarmonicChart("harmonic-Current-1"),
  "Power-2": createHarmonicChart("harmonic-Current-2"),
  "Power-3": createHarmonicChart("harmonic-Current-3")
};
// const historyVoltageCharts = {

//   "Power-1": createThdLoadHistoryChart(
//     "history-voltage-1",
//     "THD R-S (%)",
//     "THD S-T (%)",
//     "THD R-T (%)"
//   ),

//   "Power-2": createThdLoadHistoryChart(
//     "history-voltage-2",
//     "THD R-S (%)",
//     "THD S-T (%)",
//     "THD R-T (%)"
//   ),

//   "Power-3": createThdLoadHistoryChart(
//     "history-voltage-3",
//     "THD R-S (%)",
//     "THD S-T (%)",
//     "THD R-T (%)"
//   )

// };
// const historyCurrentCharts = {

//   "Power-1": createThdLoadHistoryChart(
//     "history-current-1",
//     "THD R (%)",
//     "THD S (%)",
//     "THD T (%)"
//   ),

//   "Power-2": createThdLoadHistoryChart(
//     "history-current-2",
//     "THD R (%)",
//     "THD S (%)",
//     "THD T (%)"
//   ),

//   "Power-3": createThdLoadHistoryChart(
//     "history-current-3",
//     "THD R (%)",
//     "THD S (%)",
//     "THD T (%)"
//   )

// };


// ==========================
// WEBSOCKET HANDLER
// ==========================
//const harmonicLabels = ['5', '7', '11', '13', '17', '19'];
ws.addEventListener("message", e => {
  const msg = JSON.parse(e.data);
  if (msg.type === "power"){
    const d = msg.data;
    updateTable(d);
    updateCharts(d);
  }
  if (msg.type === "harmonic") {
    const d = msg.data;
    updateHarmonicCharts(d);
  }
});


// ==========================
// TABLE CANVAS
// ==========================
function updateTable(d) {
  const tbody = document.getElementById(`turbine-${d.device}`);
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td>Voltage</td><td style="text-align:right">${d.voltage?.toFixed(2)} V</td></tr>
    <tr><td>THD Voltage Phase R-S</td><td style="text-align:right">${d.thdrs?.toFixed(2)} %</td></tr>
    <tr><td>THD Voltage Phase S-T</td><td style="text-align:right">${d.thdst?.toFixed(2)} %</td></tr>
    <tr><td>THD Voltage Phase R-T</td><td style="text-align:right">${d.thdrt?.toFixed(2)} %</td></tr>
    <tr><td>Current</td><td style="text-align:right">${d.current?.toFixed(2)} A</td></tr>
    <tr><td>THD Current Phase R</td><td style="text-align:right">${d.currentthdr?.toFixed(2)} %</td></tr>
    <tr><td>THD Current Phase S</td><td style="text-align:right">${d.currentthds?.toFixed(2)} %</td></tr>
    <tr><td>THD Current Phase T</td><td style="text-align:right">${d.currentthdt?.toFixed(2)} %</td></tr>
    <tr><td>Load</td><td style="text-align:right">${d.load?.toFixed(2)} kW</td></tr>
    <tr><td>Reactive Power (kVAR)</td><td style="text-align:right">${d.mvar?.toFixed(2)} kW</td></tr>
  `;
}


// ==========================
// THD UPDATE CHARTS FUNCTION
// ==========================
function updateCharts(d) {
  const voltagechart = loadCharts[d.device];
  if (!voltagechart) return;

  voltagechart.latestData = {
    load: d.load,
    mvar: d.mvar,
    thdrs: d.thdrs,
    thdst: d.thdst,
    thdrt: d.thdrt
  };

  const currentchart = currentCharts[d.device];
  if (!currentchart) return;

  currentchart.latestData = {
    load: d.load,
    mvar: d.mvar,
    thdrs: d.currentthdr,
    thdst: d.currentthds,
    thdrt: d.currentthdt
  };
}

// ==========================
// THD CHARTS FUNCTIONS
// ==========================
function createThdLoadChart(canvasId,r,s,t) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
      {
        label: 'Load kW',
        data: [],
        yAxisID: 'yLoad',
        borderColor: 'rgba(12,14,17,1)',
        tension: 0.2
      },
      {
        label: 'kVAR',
        data: [],
        yAxisID: 'yReactive',
        borderColor: 'rgb(163, 40, 167)',
        tension: 0.2
      },
      {
        label: r,
        data: [],
        yAxisID: 'yTHD',
        borderColor: 'rgb(220,53,69)',
        tension: 0.2
      },
      {
        label: s,
        data: [],
        yAxisID: 'yTHD',
        borderColor: 'rgb(255,193,7)',
        tension: 0.2
      },
      {
        label: t,
        data: [],
        yAxisID: 'yTHD',
        borderColor: 'rgb(13,110,253)',
        tension: 0.2
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
            delay: 1000,
            onRefresh: chart => {
              const now = Date.now();
              if (!chart.latestData) return;

              chart.data.datasets[0].data.push({ x: now, y: chart.latestData.load });
              chart.data.datasets[1].data.push({ x: now, y: chart.latestData.mvar });
              chart.data.datasets[2].data.push({ x: now, y: chart.latestData.thdrs });
              chart.data.datasets[3].data.push({ x: now, y: chart.latestData.thdst });
              chart.data.datasets[4].data.push({ x: now, y: chart.latestData.thdrt });
            }
          }
        },
        yLoad: {
          position: 'left',
          min: 0,
          max: 10000,
          title: { display: true, text: 'Load kW' }
        },

        yTHD: {
          position: 'right',
          min: 0,
          suggestedMax: 3,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'THD (%)' }
        },
        yReactive: {
          position: 'right',
          min: 0,
          suggestedMax: 2000,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'kVAR' }
        }
        
      }
    }
  });
}



// ==========================
// HARMONIC CHARTS UPDATE FUNCTION
// ==========================
function updateHarmonicCharts(d) {

  // =========================
  // VOLTAGE CHART
  // =========================
  const voltagechart = harmonicVoltageChart[d.device];
  if (!voltagechart) return;

  voltagechart.latestData = {
    hrs: [d.hrs3, d.hrs5, d.hrs7, d.hrs11, d.hrs13, d.hrs17, d.hrs19],
    hrt: [d.hrt3, d.hrt5, d.hrt7, d.hrt11, d.hrt13, d.hrt17, d.hrt19],
    hst: [d.hst3, d.hst5, d.hst7, d.hst11, d.hst13, d.hst17, d.hst19]
  };

  applyHarmonicData(voltagechart);


  // =========================
  // CURRENT CHART
  // =========================
  const currentchart = harmonicCurrentChart[d.device];
  if (!currentchart) return;

  currentchart.latestData = {
    hrs: [d.hr3, d.hr5, d.hr7, d.hr11, d.hr13, d.hr17, d.hr19],
    hrt: [d.hs3, d.hs5, d.hs7, d.hs11, d.hs13, d.hs17, d.hs19],
    hst: [d.ht3, d.ht5, d.ht7, d.ht11, d.ht13, d.ht17, d.ht19]
  };

  applyHarmonicData(currentchart);
}
function applyHarmonicData(chart) {
  if (!chart.latestData) return;

  chart.data.datasets[0].data = chart.latestData.hrs;
  chart.data.datasets[1].data = chart.latestData.hrt;
  chart.data.datasets[2].data = chart.latestData.hst;

  chart.update();
}

// ==========================
// HARMONIC CHART FUNCTIONS
// ==========================
function createHarmonicChart(canvasId) {
    const ctx = document
        .getElementById(canvasId)
        .getContext('2d');

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['3','5','7','11','13','17','19'],
            datasets: [
                {
                    label: 'HRS',
                    data: [0,0,0,0,0,0],
                    backgroundColor: 'rgba(220,53,69,0.7)'
                },
                {
                    label: 'HRT',
                    data: [0,0,0,0,0,0],
                    backgroundColor: 'rgba(255,193,7,0.7)'
                },
                {
                    label: 'HST',
                    data: [0,0,0,0,0,0],
                    backgroundColor: 'rgba(13,110,253,0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Magnitude (%)'
                    }
                }
            }
        }
    });
}

// async function loadHistory(device){

//   const start = document.getElementById(`start-${device}`).value;
//   const end = document.getElementById(`end-${device}`).value;

//   const res = await fetch(`/api/power-summary?start=${start}&end=${end}&turbine=${device}`);
//   const data = await res.json();

//   const vChart = historyVoltageCharts[device];
//   const cChart = historyCurrentCharts[device];

//   if(!vChart || !cChart) return;

//   vChart.data.datasets.forEach(d=>d.data=[]);
//   cChart.data.datasets.forEach(d=>d.data=[]);

//   data.forEach(d=>{

//     const t = new Date(d.date);

//     // voltage THD
//     vChart.data.datasets[0].data.push({x:t,y:d.load});
//     vChart.data.datasets[1].data.push({x:t,y:d.thdrs});
//     vChart.data.datasets[2].data.push({x:t,y:d.thdst});
//     vChart.data.datasets[3].data.push({x:t,y:d.thdrt});

//     // current THD
//     cChart.data.datasets[0].data.push({x:t,y:d.load});
//     cChart.data.datasets[1].data.push({x:t,y:d.currentthdr});
//     cChart.data.datasets[2].data.push({x:t,y:d.currentthds});
//     cChart.data.datasets[3].data.push({x:t,y:d.currentthdt});

//   });

//   vChart.update();
//   cChart.update();

// }
// window.loadHistory = loadHistory;

// function createThdLoadHistoryChart(canvasId,r,s,t){

//   const ctx = document.getElementById(canvasId);

//   return new Chart(ctx,{
//     type:'line',
//     data:{
//       datasets:[
//         {
//           label:'Load kW',
//           data:[],
//           yAxisID:'yLoad',
//           borderColor:'rgba(12,14,17,1)',
//           tension:0.2
//         },
//         {
//           label:r,
//           data:[],
//           yAxisID:'yTHD',
//           borderColor:'rgb(220,53,69)',
//           tension:0.2
//         },
//         {
//           label:s,
//           data:[],
//           yAxisID:'yTHD',
//           borderColor:'rgb(255,193,7)',
//           tension:0.2
//         },
//         {
//           label:t,
//           data:[],
//           yAxisID:'yTHD',
//           borderColor:'rgb(13,110,253)',
//           tension:0.2
//         }
//       ]
//     },
//     options:{
//       responsive:true,
//       animation:false,
//       scales:{
//         x:{
//           type:'time',
//           time:{
//             tooltipFormat:'HH:mm:ss',
//             displayFormats:{
//               second:'HH:mm:ss',
//               minute:'HH:mm'
//             }
//           },
//           title:{
//             display:true,
//             text:'Time'
//           }
//         },
//         yLoad:{
//           position:'left',
//           min:0,
//           max:10000,
//           title:{
//             display:true,
//             text:'Load kW'
//           }
//         },
//         yTHD:{
//           position:'right',
//           min:0,
//           suggestedMax:3,
//           grid:{drawOnChartArea:false},
//           title:{
//             display:true,
//             text:'THD (%)'
//           }
//         }
//       }
//     }
//   });

// }
