import React from "react";

type SkillRow = { employee_id: string; name: string; skills: Record<string, number>;
}; type SkillMeta = { slug: string; name: string; category: string; tier_levels: number;
}; export const SkillMatrixTable: React.FC<{ dept_id: string;
}> = ({ dept_id }) => { const [rows, setRows] = React.useState<SkillRow[]>([]); const [skills, setSkills] = React.useState<SkillMeta[]>([]); const [loading, setLoading] = React.useState(false); async function load() { setLoading(true); try { const m = await fetch(`/api/staff/skills?dept_id=${dept_id}`).then((r) => r.json() ); setRows(m.rows || []); setSkills(m.skills || []); } finally { setLoading(false); } } React.useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps }, [dept_id]); async function setLevel( eid: string, slug: string, level: number ) { await fetch("/api/staff/skills/level", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ employee_id: eid, slug, level }), }); load(); } return ( <div className="bg-gray-950 text-white rounded-2xl p-4 overflow-auto"> <div className="mb-3 font-semibold">Skill Matrix</div> {loading ? ("Loading…" ) : ( <table className="min-w-full text-sm"> <thead> <tr className="text-gray-400"> <th className="text-left p-2">Employee</th> {skills.map((s) => ( <th key={s.slug} className="text-left p-2 whitespace-nowrap"> {s.name} </th> ))} </tr> </thead> <tbody> {rows.map((r) => ( <tr key={r.employee_id} className="border-t border-gray-800"> <td className="p-2 font-medium">{r.name}</td> {skills.map((s) => { const val = r.skills[s.slug] ?? 0; return ( <td key={s.slug} className="p-2"> <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={val} onChange={(e) => setLevel(r.employee_id, s.slug, Number(e.target.value)) } > {[0, 1, 2, 3, 4, 5].map((n) => ( <option key={n} value={n}> {n} </option> ))} </select> </td> ); })} </tr> ))} </tbody> </table> )} </div> );
};

// Builder widget registration (no hooks at module scope)
if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("SkillMatrixTable", SkillMatrixTable);
  } catch {
    // ignore
  }
}
