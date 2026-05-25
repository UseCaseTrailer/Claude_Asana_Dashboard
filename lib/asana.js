// lib/asana.js — Asana API helper
// All calls use the PAT from the ASANA_PAT environment variable

const BASE = 'https://app.asana.com/api/1.0';
const WORKSPACE = process.env.ASANA_WORKSPACE_GID || '1115662927527527';

async function asanaGet(path, params = {}) {
  const token = process.env.ASANA_PAT;
  if (!token) throw new Error('ASANA_PAT environment variable not set');

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asana API ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.data;
}

// ── Portfolios ──────────────────────────────────────────────────────
async function getPortfolios() {
  return asanaGet('/portfolios', {
    workspace: WORKSPACE,
    owner: 'me',
    opt_fields: 'name,gid,color,created_at,owner.name',
    limit: 100,
  });
}

// ── Projects in a portfolio ─────────────────────────────────────────
async function getPortfolioProjects(portfolioGid) {
  return asanaGet(`/portfolios/${portfolioGid}/items`, {
    opt_fields: [
      'name,gid,color,resource_type,current_status.color,current_status.title',
      'current_status.text,due_on,start_on,owner.name,num_tasks',
      'num_incomplete_tasks,num_completed_tasks,custom_fields.gid',
      'custom_fields.name,custom_fields.display_value,custom_fields.number_value',
    ].join(','),
    limit: 100,
  });
}

// ── Tasks in a project ──────────────────────────────────────────────
async function getProjectTasks(projectGid) {
  return asanaGet(`/tasks`, {
    project: projectGid,
    opt_fields: [
      'name,gid,completed,due_on,assignee.name,assignee.gid',
      'notes,custom_fields.name,custom_fields.display_value',
    ].join(','),
    limit: 100,
    completed_since: 'now', // only incomplete — set to epoch for all
  });
}

async function getAllProjectTasks(projectGid) {
  // Returns both complete and incomplete
  return asanaGet(`/tasks`, {
    project: projectGid,
    opt_fields: 'name,gid,completed,due_on,assignee.name',
    limit: 100,
  });
}

// ── Single project ──────────────────────────────────────────────────
async function getProject(projectGid) {
  return asanaGet(`/projects/${projectGid}`, {
    opt_fields: [
      'name,gid,color,due_on,start_on,owner.name',
      'current_status.color,current_status.title,current_status.text',
      'num_tasks,num_incomplete_tasks,num_completed_tasks',
      'custom_fields.name,custom_fields.display_value,custom_fields.number_value',
    ].join(','),
  });
}

// ── Task actions (write) ────────────────────────────────────────────
async function updateTask(taskGid, body) {
  const token = process.env.ASANA_PAT;
  const res = await fetch(`${BASE}/tasks/${taskGid}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) throw new Error(`Asana update ${res.status}`);
  return (await res.json()).data;
}

async function createTask(body) {
  const token = process.env.ASANA_PAT;
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { workspace: WORKSPACE, ...body } }),
  });
  if (!res.ok) throw new Error(`Asana create ${res.status}`);
  return (await res.json()).data;
}

async function addComment(taskGid, text) {
  const token = process.env.ASANA_PAT;
  const res = await fetch(`${BASE}/tasks/${taskGid}/stories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { text } }),
  });
  if (!res.ok) throw new Error(`Asana comment ${res.status}`);
  return (await res.json()).data;
}

module.exports = {
  getPortfolios,
  getPortfolioProjects,
  getProjectTasks,
  getAllProjectTasks,
  getProject,
  updateTask,
  createTask,
  addComment,
};
