const express = require("express");
const router = express.Router();
const { collections } = require("../services/serverInit");

// =====================================================
// API FLOW SUMMARY
// =====================================================
router.get("/flow-summary", async (req, res) => {

  const { type, turbine } = req.query;

  try {

    if (!collections) return res.json([]);

    // ===============================
    // DAILY SUMMARY
    // ===============================
    if (type === "daily") {

      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      start.setHours(0,0,0,0);

      const query = {
        date: { $gte: start }
      };

      if (turbine) query.turbine = turbine;

      const raw = await collections.flow_daily_summary
        .find(query)
        .toArray();

      const map = new Map();

      raw.forEach(r => {
        const key = r.date.toISOString().slice(0,10);
        map.set(key, r);
      });

      const result = [];

      for (let i = 29; i >= 0; i--) {

        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const key = d.toISOString().slice(0,10);
        const found = map.get(key);

        result.push({
          date: key,
          sumFlow: found?.sumFlow ?? null,
          avgLoad: found?.avgLoad ?? null,
          avgWaterPower: found?.avgWaterPower ?? null
          
        });

      }

      return res.json(result);
    }

    // ===============================
    // MONTHLY SUMMARY
    // ===============================
    if (type === "monthly") {

      const now = new Date();
      const startYear = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      const query = {
        year: { $gte: startYear.getFullYear() }
      };

      if (turbine) query.turbine = turbine;

      const raw = await collections.flow_monthly_summary
        .find(query)
        .toArray();

      const map = new Map();

      raw.forEach(r => {
        const key = `${r.year}-${r.month}`;
        map.set(key, r);
      });

      const result = [];

      for (let i = 11; i >= 0; i--) {

        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const key = `${year}-${month}`;
        const found = map.get(key);

        result.push({
          year,
          month,
          sumFlow: found?.sumFlow ?? null,
          avgLoad: found?.avgLoad ?? null,
          avgWaterPower: found?.avgWaterPower ?? null
        });

      }

      return res.json(result);
    }

    return res.status(400).json({ error: "Invalid type" });

  } catch (err) {

    console.error("Summary API error:", err);
    res.status(500).json({ error: "Server error" });

  }

});

module.exports = router;