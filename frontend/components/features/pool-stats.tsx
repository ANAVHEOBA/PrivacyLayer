"use client";

import { useEffect } from "react";
import { usePoolStore } from "@/lib/store";
import { getDenominationLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function PoolStats() {
  const { stats, loading, error, refreshStats } = usePoolStore();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="p-6">
          <p className="text-sm text-red-400">Failed to load pool stats: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: "Pool Status",
      value: stats?.paused ? "Paused" : "Active",
      badge: stats?.paused ? "destructive" as const : "success" as const,
    },
    {
      label: "Total Deposits",
      value: stats?.depositCount?.toLocaleString() ?? "0",
    },
    {
      label: "Denomination",
      value: stats?.denomination ? getDenominationLabel(stats.denomination) : "--",
    },
    {
      label: "Token",
      value: stats?.token ?? "--",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.label} className="glass glass-hover">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            {item.badge ? (
              <Badge variant={item.badge}>{item.value}</Badge>
            ) : (
              <p className="text-2xl font-bold">{item.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
