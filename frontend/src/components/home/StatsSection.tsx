import { cn } from '@/lib/utils';

const stats = [
  { label: 'Total Value Locked', value: '$2,547,892', change: '+12.3%', positive: true },
  { label: 'Active Deposits', value: '1,847', change: '+5.2%', positive: true },
  { label: 'Private Withdrawals', value: '1,203', change: '+8.1%', positive: true },
  { label: 'Unique Users', value: '892', change: '+15.7%', positive: true },
];

export function StatsSection() {
  return (
    <section className="py-16 border-y border-border bg-card">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-sm text-muted-foreground mb-2">
                {stat.label}
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className={cn(
                'text-sm mt-1',
                stat.positive ? 'text-success' : 'text-error'
              )}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}