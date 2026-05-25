// api/portfolios.js
// GET /api/portfolios
// Returns all portfolios with their projects and tasks — the full PMO dataset

const {
  getPortfolios,
  getPortfolioProjects,
  getAllProjectTasks,
} = require('../lib/asana');

// Health-scoring (mirrors the dashboard frontend logic)
function scoreProject(tasks) {
  const N = tasks.length || 1;
  const TODAY = new Date().toISOString().split('T')[0];
  const done  = tasks.filter(t => t.completed).length;
  const ov    = tasks.filter(t => !t.completed && t.due_on && t.due_on < TODAY).length;
  const ua    = tasks.filter(t => !t.assignee).length;
  const nd    = tasks.filter(t => !t.completed && !t.due_on).length;
  const cp = Math.round(done / N * 100);
  const oS = Math.max(0, 100 - Math.round(ov / N * 100) * 3);
  const aS = Math.max(0, 100 - Math.round(ua / N * 100) * 2);
  const sS = Math.max(0, 100 - Math.round(nd / N * 100) * 1.5);
  return {
    v: Math.round(cp * 0.3 + oS * 0.35 + aS * 0.2 + sS * 0.15),
    cp, oS, aS, sS, done, ov, ua, nd, N,
  };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const portfolios = await getPortfolios();

    const enriched = await Promise.all(
      portfolios.map(async (portfolio) => {
        let projects = [];
        try {
          const items = await getPortfolioProjects(portfolio.gid);
          // Filter to only projects (not goals etc.)
          const projectItems = items.filter(i => i.resource_type === 'project');

          projects = await Promise.all(
            projectItems.map(async (proj) => {
              let tasks = [];
              try {
                tasks = await getAllProjectTasks(proj.gid);
              } catch (e) {
                console.warn(`Tasks failed for ${proj.gid}:`, e.message);
              }

              const normalizedTasks = tasks.map(t => ({
                gid: t.gid,
                n: t.name,
                done: t.completed,
                due: t.due_on || null,
                who: t.assignee?.name || null,
              }));

              const status = proj.current_status || null;

              return {
                gid: proj.gid,
                name: proj.name,
                due_on: proj.due_on || null,
                start_on: proj.start_on || null,
                owner: proj.owner?.name || null,
                status: status ? {
                  color: status.color,
                  title: status.title,
                  text: status.text,
                } : null,
                score: scoreProject(normalizedTasks),
                tasks: normalizedTasks,
              };
            })
          );
        } catch (e) {
          console.warn(`Portfolio items failed for ${portfolio.gid}:`, e.message);
        }

        return {
          gid: portfolio.gid,
          name: portfolio.name,
          color: portfolio.color || '#6366f1',
          projects,
        };
      })
    );

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ data: enriched, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('Portfolios API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
