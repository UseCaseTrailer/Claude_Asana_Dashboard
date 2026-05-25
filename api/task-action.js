// api/task-action.js
// POST /api/task-action
// Body: { action, taskGid, projectGid, ...params }
// Executes write operations back into Asana

const { updateTask, createTask, addComment } = require('../lib/asana');

const ALLOWED_ACTIONS = [
  'COMPLETE_TASK',
  'ADD_COMMENT',
  'ASSIGN_TASK',
  'UPDATE_DUE_DATE',
  'RENAME_TASK',
  'CREATE_TASK',
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, taskGid, projectGid, ...params } = req.body;

  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  try {
    let result;

    switch (action) {
      case 'COMPLETE_TASK': {
        if (!taskGid) return res.status(400).json({ error: 'taskGid required' });
        result = await updateTask(taskGid, { completed: params.completed ?? true });
        break;
      }

      case 'ADD_COMMENT': {
        if (!taskGid || !params.comment) return res.status(400).json({ error: 'taskGid and comment required' });
        result = await addComment(taskGid, params.comment);
        break;
      }

      case 'ASSIGN_TASK': {
        if (!taskGid) return res.status(400).json({ error: 'taskGid required' });
        // assignee can be email, GID, or 'me'
        result = await updateTask(taskGid, { assignee: params.assignee });
        break;
      }

      case 'UPDATE_DUE_DATE': {
        if (!taskGid) return res.status(400).json({ error: 'taskGid required' });
        result = await updateTask(taskGid, { due_on: params.due_on });
        break;
      }

      case 'RENAME_TASK': {
        if (!taskGid || !params.new_name) return res.status(400).json({ error: 'taskGid and new_name required' });
        result = await updateTask(taskGid, { name: params.new_name });
        break;
      }

      case 'CREATE_TASK': {
        if (!params.name) return res.status(400).json({ error: 'name required' });
        const body = {
          name: params.name,
          ...(projectGid && { projects: [projectGid] }),
          ...(params.assignee && { assignee: params.assignee }),
          ...(params.due_on && { due_on: params.due_on }),
          ...(params.notes && { notes: params.notes }),
        };
        result = await createTask(body);
        break;
      }
    }

    return res.status(200).json({ ok: true, data: result });

  } catch (err) {
    console.error(`Task action ${action} failed:`, err);
    return res.status(500).json({ error: err.message });
  }
}
