import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlanList({ data }: { data: any }){
  if(!data?.candidates?.length) return null;
  return (
    <div className="grid gap-4">
      {data.candidates.map((c:any)=> (
        <Card key={c.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">{c.title}</CardTitle>
              <div className="text-xs text-muted-foreground">Score: {c.score.total.toFixed(1)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {c.steps.map((s:string, i:number)=> <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
