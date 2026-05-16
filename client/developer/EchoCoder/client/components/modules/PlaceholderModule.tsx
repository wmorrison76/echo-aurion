import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderProps {
  title: string;
  description: string;
  features: string[];
}

export default function PlaceholderModule({ title, description, features }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Module is ready for development</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm">Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
