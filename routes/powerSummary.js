const express = require("express");
const router = express.Router();
const { collections } = require("../services/serverInit");

// =====================================================
// API POWER SUMMARY (CUSTOM TIME RANGE)
// =====================================================
router.get("/power-summary", async (req, res) => {

  const { start, end, turbine } = req.query;

  try {

    if (!collections) return res.json([]);

    if (!start || !end) {
      return res.status(400).json({
        error: "start and end query required"
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const query = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (turbine) query.turbine = turbine;

    const data = await collections.power
      .find(query)
      .sort({ date: 1 })
      .toArray();

    const result = data.map(r => ({
      date: r.date,
      turbine: r.turbine,
      voltage: r.voltage ?? null,
      current: r.current ?? null,
      thdrs: r.thdrs ?? null,
      thdst: r.thdst ?? null,
      thdrt: r.thdrt ?? null,
      currentthdr: r.currentthdr ?? null,
      currentthds: r.currentthds ?? null,
      currentthdt: r.currentthdt ?? null,
      load: r.load ?? null
    }));

    res.json(result);

  } catch (err) {

    console.error("Power summary error:", err);
    res.status(500).json({ error: "Server error" });

  }

});

module.exports = router;