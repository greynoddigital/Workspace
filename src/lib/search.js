// src/lib/search.js
//
// Very simple search: loads all projects (from GitHub) and filters
// them in memory. The workspace is a single-user, small-scale tool,
// so there is no need for an index or a database - a plain filter
// over project.json files is fast enough.

const { listProjectsSorted } = require("./projectStore");

async function searchProjects(query) {
  const q = (query || "").trim().toLowerCase();
  const projects = await listProjectsSorted();
  if (!q) return projects;

  return projects.filter((project) => {
    const haystack = [
      project.projectName,
      project.clientName,
      project.phone,
      project.email,
      project.status,
      project.id,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

module.exports = { searchProjects };
