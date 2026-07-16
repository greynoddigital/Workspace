// src/routes/dashboard.js
//
// GET /api/dashboard
// Returns the numbers shown on the Dashboard page: project counts,
// payment totals, and the 5 most recently updated projects.

const express = require("express");
const { listProjectsSorted } = require("../lib/projectStore");
const { projectTotals } = require("../lib/calculations");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const projects = await listProjectsSorted();

    let totalReceived = 0;
    let totalPending = 0;
    let activeCount = 0;
    let completedCount = 0;

    const projectSummaries = projects.map((project) => {
      const totals = projectTotals(project);
      totalReceived += totals.paid;
      totalPending += totals.pending;

      if (project.status === "Completed") completedCount += 1;
      if (project.status === "In Progress" || project.status === "Lead") activeCount += 1;

      return {
        id: project.id,
        projectName: project.projectName,
        clientName: project.clientName,
        status: project.status,
        total: totals.total,
        paid: totals.paid,
        pending: totals.pending,
        updatedAt: project.updatedAt,
      };
    });

    res.json({
      totalProjects: projects.length,
      activeProjects: activeCount,
      completedProjects: completedCount,
      totalPaymentReceived: totalReceived,
      totalPaymentPending: totalPending,
      recentProjects: projectSummaries.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
