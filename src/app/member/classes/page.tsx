"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/i18n/format";
import { Loader2 } from "lucide-react";

interface GymClassRow {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  bookingsCount: number;
  capacity: number;
}

export default function MemberClassesPage() {
  const { translate, locale } = useLocale();
  const [classes, setClasses] = useState<GymClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success) setClasses(json.data.classes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{translate("member.classes.title")}</h1>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{translate("member.classes.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(c.startsAt), locale)} · {c.bookingsCount}/{c.capacity} {translate("member.classes.spots")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
