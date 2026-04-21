// =====================================================
// POWER SUMMARY SERVICE
// =====================================================

const { collections,getMakassarMinuteRange, getMakassarDayRange, getMakassarMonthRange } = require("./serverInit");

// =====================================================
// MINUTE SUMMARY
// =====================================================
async function summarizePowerMinute(date = new Date()) {

  if (!collections.power) return;

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

        _id: { device: "$device" },

        voltage_avg: { $avg: "$voltage" },
        current_avg: { $avg: "$current" },
        load_avg: { $avg: "$load" },

        thdrs_avg: { $avg: "$thdrs" },
        thdst_avg: { $avg: "$thdst" },
        thdrt_avg: { $avg: "$thdrt" },

        currentthdr_avg: { $avg: "$currentthdr" },
        currentthds_avg: { $avg: "$currentthds" },
        currentthdt_avg: { $avg: "$currentthdt" }

      }
    }
  ];

  const results = await collections.power.aggregate(pipeline).toArray();
  for (const r of results) {
    await collections.power_1m.updateOne(
      {
        device: r._id.device,
        ts: start
      },
      {
        $set: {

          voltage_avg: r.voltage_avg,
          current_avg: r.current_avg,
          load_avg: r.load_avg,

          thdrs_avg: r.thdrs_avg,
          thdst_avg: r.thdst_avg,
          thdrt_avg: r.thdrt_avg,

          currentthdr_avg: r.currentthdr_avg,
          currentthds_avg: r.currentthds_avg,
          currentthdt_avg: r.currentthdt_avg,

          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

  }

}

// =====================================================
// DAILY SUMMARY
// =====================================================
async function summarizePowerDaily(date = new Date()) {

  if (!collections.power_1m) return;

  const start = new Date(date);
  start.setHours(0,0,0,0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const pipeline = [
    {
      $match: {
        ts: { $gte: start, $lt: end }
      }
    },
    {
      $group: {

        _id: "$device",

        voltage_avg: { $avg: "$voltage_avg" },
        current_avg: { $avg: "$current_avg" },
        load_avg: { $avg: "$load_avg" },

        thdrs_avg: { $avg: "$thdrs_avg" },
        thdst_avg: { $avg: "$thdst_avg" },
        thdrt_avg: { $avg: "$thdrt_avg" },

        currentthdr_avg: { $avg: "$currentthdr_avg" },
        currentthds_avg: { $avg: "$currentthds_avg" },
        currentthdt_avg: { $avg: "$currentthdt_avg" }

      }
    }
  ];

  const results = await collections.power_1m.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.power_daily_summary.updateOne(
      {
        device: r._id,
        date: start
      },
      {
        $set: {

          voltage_avg: r.voltage_avg,
          current_avg: r.current_avg,
          load_avg: r.load_avg,

          thdrs_avg: r.thdrs_avg,
          thdst_avg: r.thdst_avg,
          thdrt_avg: r.thdrt_avg,

          currentthdr_avg: r.currentthdr_avg,
          currentthds_avg: r.currentthds_avg,
          currentthdt_avg: r.currentthdt_avg,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

}
// =====================================================
// MONTHLY SUMMARY
// =====================================================
async function summarizePowerMonthly(date = new Date()) {

  if (!collections.power_daily_summary) return;

  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const pipeline = [
    {
      $match: {
        date: { $gte: start, $lt: end }
      }
    },
    {
      $group: {

        _id: "$device",

        voltage_avg: { $avg: "$voltage_avg" },
        current_avg: { $avg: "$current_avg" },
        load_avg: { $avg: "$load_avg" },

        thdrs_avg: { $avg: "$thdrs_avg" },
        thdst_avg: { $avg: "$thdst_avg" },
        thdrt_avg: { $avg: "$thdrt_avg" },

        currentthdr_avg: { $avg: "$currentthdr_avg" },
        currentthds_avg: { $avg: "$currentthds_avg" },
        currentthdt_avg: { $avg: "$currentthdt_avg" }

      }
    }
  ];

  const results = await collections.power_daily_summary.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.power_monthly_summary.updateOne(
      {
        device: r._id,
        year: year,
        month: month + 1
      },
      {
        $set: {

          voltage_avg: r.voltage_avg,
          current_avg: r.current_avg,
          load_avg: r.load_avg,

          thdrs_avg: r.thdrs_avg,
          thdst_avg: r.thdst_avg,
          thdrt_avg: r.thdrt_avg,

          currentthdr_avg: r.currentthdr_avg,
          currentthds_avg: r.currentthds_avg,
          currentthdt_avg: r.currentthdt_avg,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

}
module.exports = {
    summarizePowerMinute,
    summarizePowerDaily,
    summarizePowerMonthly
};