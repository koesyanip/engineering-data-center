const { collections } = require("./serverInit");

// =====================================================
// VIBRATION MINUTE SUMMARY
// =====================================================
async function summarizeVibrationMinute(date = new Date()) {

  if (!collections.vibration) return;

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

        _id: { turbine: "$turbine" },

        rms_avg: { $avg: "$rms" },
        velocityRMS_avg: { $avg: "$velocityRMS" },
        vortexRMS_avg: { $avg: "$vortexRMS" },

        amp_05x_avg: { $avg: "$amp_05x" },
        amp_1x_avg: { $avg: "$amp_1x" },
        amp_2x_avg: { $avg: "$amp_2x" },
        amp_3x_avg: { $avg: "$amp_3x" },

        peakFreq_avg: { $avg: "$peakFreq" },
        peakAmp_max: { $max: "$peakAmp" },

        energyBand_avg: { $avg: "$energyBand" }

      }
    }
  ];

  const results = await collections.vibration.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.vibration_1m.updateOne(
      {
        turbine: r._id.turbine,
        ts: start
      },
      {
        $set: {

          rms_avg: r.rms_avg,
          velocityRMS_avg: r.velocityRMS_avg,
          vortexRMS_avg: r.vortexRMS_avg,

          amp_05x_avg: r.amp_05x_avg,
          amp_1x_avg: r.amp_1x_avg,
          amp_2x_avg: r.amp_2x_avg,
          amp_3x_avg: r.amp_3x_avg,

          peakFreq_avg: r.peakFreq_avg,
          peakAmp_max: r.peakAmp_max,

          energyBand_avg: r.energyBand_avg,

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
async function summarizeVibrationDaily(date = new Date()) {

  if (!collections.vibration_1m) return;

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

        _id: "$turbine",

        rms_avg: { $avg: "$rms_avg" },
        velocityRMS_avg: { $avg: "$velocityRMS_avg" },
        vortexRMS_avg: { $avg: "$vortexRMS_avg" },

        amp_05x_avg: { $avg: "$amp_05x_avg" },
        amp_1x_avg: { $avg: "$amp_1x_avg" },
        amp_2x_avg: { $avg: "$amp_2x_avg" },
        amp_3x_avg: { $avg: "$amp_3x_avg" },

        peakFreq_avg: { $avg: "$peakFreq_avg" },
        peakAmp_max: { $max: "$peakAmp_max" },

        energyBand_avg: { $avg: "$energyBand_avg" }

      }
    }
  ];

  const results = await collections.vibration_1m.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.vibration_daily_summary.updateOne(
      {
        turbine: r._id,
        date: start
      },
      {
        $set: {

          rms_avg: r.rms_avg,
          velocityRMS_avg: r.velocityRMS_avg,
          vortexRMS_avg: r.vortexRMS_avg,

          amp_05x_avg: r.amp_05x_avg,
          amp_1x_avg: r.amp_1x_avg,
          amp_2x_avg: r.amp_2x_avg,
          amp_3x_avg: r.amp_3x_avg,

          peakFreq_avg: r.peakFreq_avg,
          peakAmp_max: r.peakAmp_max,

          energyBand_avg: r.energyBand_avg,

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
async function summarizeVibrationMonthly(date = new Date()) {

  if (!collections.vibration_daily_summary) return;

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

        _id: "$turbine",

        rms_avg: { $avg: "$rms_avg" },
        velocityRMS_avg: { $avg: "$velocityRMS_avg" },
        vortexRMS_avg: { $avg: "$vortexRMS_avg" },

        amp_05x_avg: { $avg: "$amp_05x_avg" },
        amp_1x_avg: { $avg: "$amp_1x_avg" },
        amp_2x_avg: { $avg: "$amp_2x_avg" },
        amp_3x_avg: { $avg: "$amp_3x_avg" },

        peakFreq_avg: { $avg: "$peakFreq_avg" },
        peakAmp_max: { $max: "$peakAmp_max" },

        energyBand_avg: { $avg: "$energyBand_avg" }

      }
    }
  ];

  const results = await collections.vibration_daily_summary.aggregate(pipeline).toArray();

  for (const r of results) {

    await collections.vibration_monthly_summary.updateOne(
      {
        turbine: r._id,
        year: year,
        month: month + 1
      },
      {
        $set: {

          rms_avg: r.rms_avg,
          velocityRMS_avg: r.velocityRMS_avg,
          vortexRMS_avg: r.vortexRMS_avg,

          amp_05x_avg: r.amp_05x_avg,
          amp_1x_avg: r.amp_1x_avg,
          amp_2x_avg: r.amp_2x_avg,
          amp_3x_avg: r.amp_3x_avg,

          peakFreq_avg: r.peakFreq_avg,
          peakAmp_max: r.peakAmp_max,

          energyBand_avg: r.energyBand_avg,

          updatedAt: new Date()

        }
      },
      { upsert: true }
    );

  }

}
module.exports = {
    summarizeVibrationMinute,
    summarizeVibrationDaily,
    summarizeVibrationMonthly
};