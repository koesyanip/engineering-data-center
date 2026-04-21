const { collections } = require("./serverInit");
// ==========================
// MINUTE SUMMARY
// ==========================
async function summarizeMinute(date = new Date()) {

  if (!collections.flow) return;

  const start = new Date(date);
  start.setSeconds(0,0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 1);

  const pipeline = [
    {
      $match: {
        ts: { $gte: start, $lt: end }
      }
    },
    {
      $group: {

        _id: "$turbine",
        count: { $sum: 1 },

        sumFlow: { $avg: "$flow" },

        avgFlow: { $avg: "$flow" },
        avgLoad: { $avg: "$load" },
        avgWaterPower: { $avg: "$waterpower" },
        avgSwc: { $avg: "$swc" },
        avgEfficiency: { $avg: "$efficiency" },
        avgNetHead: { $avg: "$nethead" },
        avgPressure: { $avg: "$pressure" }

      }
    }
  ];

  const results = await collections.flow.aggregate(pipeline).toArray();
  //console.log(results);

  for (const r of results) {
    await collections.flow_1m.updateOne(
      {
        turbine: r._id,
        ts: start
      },
      {
        $set: {

          turbine: r._id,
          ts: start,

          avgFlow: r.avgFlow,
          sumFlow: r.avgFlow*60,

          avgLoad: r.avgLoad,
          avgWaterPower: r.avgWaterPower,
          avgSwc: r.avgSwc,
          avgEfficiency: r.avgEfficiency,
          avgNetHead: r.avgNetHead,
          avgPressure: r.avgPressure,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

  console.log("Minute Summary Done");
  console.log(start);
}



// ==========================
// DAILY SUMMARY
// ==========================
async function summarizeDaily(date = new Date()) {

  if (!collections.flow_1m) return;

  const start = new Date(date);
  start.setUTCHours(0,0,0,0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const pipeline = [
    {
      $match: {
        ts: { $gte: start, $lt: end }
      }
    },
    {
      $group: {

        _id: "$turbine",

        sumFlow: { $sum: "$sumFlow" },

        avgFlow: { $avg: "$avgFlow" },
        avgLoad: { $avg: "$avgLoad" },
        avgWaterPower: { $avg: "$avgWaterPower" },
        avgSwc: { $avg: "$avgSwc" },
        avgEfficiency: { $avg: "$avgEfficiency" },
        avgNetHead: { $avg: "$avgNetHead" },
        avgPressure: { $avg: "$avgPressure" }

      }
    }
  ];

  const results = await collections.flow_1m.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.flow_daily_summary.updateOne(
      {
        turbine: r._id,
        date: start
      },
      {
        $set: {

          turbine: r._id,
          date: start,

          sumFlow: r.sumFlow,

          avgFlow: r.avgFlow,
          avgLoad: r.avgLoad,
          avgWaterPower: r.avgWaterPower,
          avgSwc: r.avgSwc,
          avgEfficiency: r.avgEfficiency,
          avgNetHead: r.avgNetHead,
          avgPressure: r.avgPressure,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

  console.log("Daily Summary Done");
  console.log(start);
}



// ==========================
// MONTHLY SUMMARY
// ==========================
async function summarizeMonthly(date = new Date()) {

  if (!collections.flow_daily_summary) return;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const pipeline = [
    {
      $match: {
        date: { $gte: start, $lt: end }
      }
    },
    {
      $group: {

        _id: "$turbine",

        sumFlow: { $sum: "$sumFlow" },

        avgFlow: { $avg: "$avgFlow" },
        avgLoad: { $avg: "$avgLoad" },
        avgWaterPower: { $avg: "$avgWaterPower" },
        avgSwc: { $avg: "$avgSwc" },
        avgEfficiency: { $avg: "$avgEfficiency" },
        avgNetHead: { $avg: "$avgNetHead" },
        avgPressure: { $avg: "$avgPressure" }

      }
    }
  ];

  const results = await collections.flow_daily_summary.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.flow_monthly_summary.updateOne(
      {
        turbine: r._id,
        year: year,
        month: month + 1
      },
      {
        $set: {

          sumFlow: r.sumFlow,

          avgFlow: r.avgFlow,
          avgLoad: r.avgLoad,
          avgWaterPower: r.avgWaterPower,
          avgSwc: r.avgSwc,
          avgEfficiency: r.avgEfficiency,
          avgNetHead: r.avgNetHead,
          avgPressure: r.avgPressure,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

}



module.exports = {
  summarizeMinute,
  summarizeDaily,
  summarizeMonthly
};