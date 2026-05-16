/**
 * Team Development & Training Hub - Culinary Staff
 */
import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Checkbox } from '../components/ui/checkbox';
import { HACCPPanel } from '../components/panels/HACCPPanel';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, ShieldCheck, Users, GraduationCap, ChefHat, ExternalLink, CheckCircle2 } from 'lucide-react';

function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch {}
    return initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState] as const;
}

const resourceLinks: { title: string; href: string; desc: string }[] = [
  { title: 'FDA Food Code 2022 (Download)', href: 'https://www.fda.gov/food/fda-food-code/food-code-2022', desc: 'Current model food code – foundational for safe food operations.' },
  { title: 'USDA FSIS HACCP Systems Guidance', href: 'https://www.fsis.usda.gov/guidelines/2021-0017', desc: 'Comprehensive guide to designing and validating HACCP systems.' },
  { title: 'WHO: Five Keys to Safer Food', href: 'https://www.who.int/teams/nutrition-and-food-safety/food-safety/consumer-education', desc: 'Core global principles for food safety training.' },
  { title: 'ServSafe Manager Study Resources', href: 'https://www.servsafe.com/resources', desc: 'Study guides and materials for certification prep.' },
  { title: 'NACMCF HACCP Principles', href: 'https://www.fsis.usda.gov/science-data/national-advisory-committee-microbiological-criteria-foods', desc: 'Foundational HACCP principles from NACMCF.' },
];

const stationManuals: { station: string; items: { title: string; points: string[] }[] }[] = [
  { station: 'Garde Manger', items: [
    { title: 'Knife Skills & Safety', points: ['Grip and stance', 'Knife maintenance', 'Cut consistency', 'First-aid protocol'] },
    { title: 'Cold Station Standards', points: ['Salad mise en place map', 'Plating specs w/ photos', 'Allergen segregation', 'Hold times & labeling'] },
  ]},
  { station: 'Hot Line', items: [
    { title: 'Sauté & Grill Fundamentals', points: ['Station setup checklist', 'Pan heat management', 'Protein doneness guide', 'Resting and carryover'] },
    { title: 'Sauce Station', points: ['Mother sauces ratios', 'Reduction and mounting', 'HACCP for cooling/holding', 'Reheat limits'] },
  ]},
  { station: 'Butchery', items: [
    { title: 'Yield & Trim Management', points: ['Spec sheet by cut', 'Yield tests and logs', 'Cross-contamination controls', 'Sharpening SOP'] },
  ]},
  { station: 'Pastry', items: [
    { title: 'Baking Science', points: ['Scaling accuracy', 'Gluten development', 'Emulsions & foams', 'Chocolate tempering curves'] },
  ]},
  { station: 'Banquets', items: [
    { title: 'Batch Cooking & Reheat', points: ['Cook-chill parameters', 'Rapid chill SOP', 'Reheat curve to 165°F/74°C', 'Labeling and lot control'] },
  ]},
];

const defaultStandup: { id: string; label: string }[] = [
  { id: 'events', label: 'Review today’s events, covers, and timelines' },
  { id: 'prep', label: 'Confirm prep list ownership and blockers' },
  { id: 'safety', label: 'HACCP critical checks (temps, cooling logs, sanitizer)' },
  { id: 'allergens', label: 'Allergen risks and labeling confirmed' },
  { id: '86', label: '86 list, subs, and menu callouts' },
  { id: 'staffing', label: 'Staffing, cross-coverage, and training focus' },
];

const skills = [
  { role: 'Prep', items: ['Knife Safety', 'Vegetable Cuts', 'Sanitation SOP', 'Labeling FIFO'] },
  { role: 'Line', items: ['Station Setup', 'Protein Temps', 'Sauce Work', 'Plating Specs'] },
  { role: 'Butcher', items: ['Yield Test', 'Primal Breakdown', 'Allergen Control', 'Sharpening'] },
  { role: 'Pastry', items: ['Scaling', 'Custards', 'Meringue', 'Chocolate Temper'] },
];

export default function Whiteboard() {
  const [standupChecks, setStandupChecks] = useLocalState<Record<string, boolean>>('training:standup', {});
  const [completedModules, setCompletedModules] = useLocalState<Record<string, boolean>>('training:modules', {});
  const [skillMatrix, setSkillMatrix] = useLocalState<Record<string, Record<string, boolean>>>('training:skills', {});

  const toggleStandup = (id: string) => setStandupChecks(v => ({ ...v, [id]: !v[id] }));
  const toggleModule = (key: string) => setCompletedModules(v => ({ ...v, [key]: !v[key] }));
  const toggleSkill = (role: string, item: string) => setSkillMatrix(v => ({ ...v, [role]: { ...(v[role]||{}), [item]: !(v[role]?.[item]) } }));

  return (
    <DashboardLayout title="Team Development & Training" subtitle="Elite culinary training, HACCP, SOPs, and daily stand-up toolkit">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Stand-up + Quick Links */}
        <div className="space-y-6 xl:col-span-1">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Daily Stand-up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {defaultStandup.map(item => (
                  <label key={item.id} className="flex items-center gap-3">
                    <Checkbox checked={!!standupChecks[item.id]} onCheckedChange={() => toggleStandup(item.id)} />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/calendar"><Button variant="outline" size="sm"><ClipboardList className="h-4 w-4 mr-2" />Agenda</Button></Link>
                <Link to="/haccp"><Button variant="outline" size="sm"><ShieldCheck className="h-4 w-4 mr-2" />HACCP</Button></Link>
                <Link to="/recipes"><Button variant="outline" size="sm"><BookOpen className="h-4 w-4 mr-2" />Recipes</Button></Link>
                <Link to="/pre-inspection"><Button variant="outline" size="sm"><ChefHat className="h-4 w-4 mr-2" />Pre-Inspection</Button></Link>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Training Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {stationManuals.map((s) => (
                  <AccordionItem key={s.station} value={s.station}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.station}</span>
                        <Badge variant="outline">{s.items.length} modules</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {s.items.map((m) => {
                          const key = `${s.station}:${m.title}`;
                          return (
                            <div key={key} className="p-3 rounded border bg-background/50">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{m.title}</div>
                                <Button variant={completedModules[key] ? 'secondary' : 'outline'} size="sm" onClick={() => toggleModule(key)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> {completedModules[key] ? 'Completed' : 'Mark complete'}
                                </Button>
                              </div>
                              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                                {m.points.map((p, i) => (<li key={i}>{p}</li>))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Best-Practice Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resourceLinks.map((r) => (
                  <a key={r.href} href={r.href} target="_blank" rel="noreferrer" className="block p-3 rounded-lg border bg-background/50 hover:bg-accent">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-sm text-muted-foreground">{r.desc}</div>
                      </div>
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: HACCP + SOPs + Skill Matrix */}
        <div className="space-y-6 xl:col-span-2">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> HACCP Program</CardTitle>
            </CardHeader>
            <CardContent>
              <HACCPPanel />
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> SOPs and Checklists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-background/50">
                  <div className="font-medium mb-2">Opening Checklist</div>
                  {['Temp log – fridges/freezers', 'Sanitizer buckets @ 150–400 ppm QUAT or 50–100 ppm chlorine', 'Handwash stations stocked', 'Allergen station set and labeled'].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!skillMatrix['OPEN']?.[t]} onCheckedChange={() => toggleSkill('OPEN', t)} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
                <div className="p-3 rounded-lg border bg-background/50">
                  <div className="font-medium mb-2">Closing Checklist</div>
                  {['Cooling logs complete', 'Labels dated and FIFOed', 'Equipment sanitized', 'Waste and yield logs submitted'].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!skillMatrix['CLOSE']?.[t]} onCheckedChange={() => toggleSkill('CLOSE', t)} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Skill Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skills.map(s => (
                  <div key={s.role} className="p-3 rounded-lg border bg-background/50">
                    <div className="font-medium mb-2">{s.role}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {s.items.map(it => (
                        <label key={it} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={!!skillMatrix[s.role]?.[it]} onCheckedChange={() => toggleSkill(s.role, it)} />
                          <span>{it}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
