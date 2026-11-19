"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useCallback, useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface GymClassRow {
  id: string;
  name: string;
  trainerName: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookingsCount: number;
  status: string;
}

export default function ClassesPage() {
  const tStatic = useStaticUiTranslations("static");
  const [classes, setClasses] = useState<GymClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? tStatic("01032f5c6e96"));
        return;
      }
      setClasses(json.data.classes);
    } catch {
      setError(tStatic("01032f5c6e96"));
    } finally {
      setLoading(false);
    }
  }, [tStatic]);

  useEffect(() => {
    load();
  }, [load]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trainerName: trainerName || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          capacity: Number(capacity),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? tStatic("10b2998c3d12"));
        return;
      }
      setShowForm(false);
      setName("");
      setTrainerName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("ed1846afee3b")}
        description={tStatic("5be211b414b8")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/dashboard/marketplace"><LocalizedText id="983095c0ea49" leading={""} trailing={""} /></Link>
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              <LocalizedText id="ed7a967c08bb" leading={""} trailing={"\n            "} /></Button>
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base"><LocalizedText id="184f5c77d91d" leading={""} trailing={""} /></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createClass} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name"><LocalizedText id="709a23220f2c" leading={""} trailing={""} /></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer"><LocalizedText id="63deca910cbd" leading={""} trailing={""} /></Label>
                <Input id="trainer" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="starts"><LocalizedText id="fc612a2fcc72" leading={""} trailing={""} /></Label>
                <Input
                  id="starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends"><LocalizedText id="91856dcb7d93" leading={""} trailing={""} /></Label>
                <Input
                  id="ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity"><LocalizedText id="45bd908df490" leading={""} trailing={""} /></Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tStatic("efc007a393f6")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-lg">{c.name}</CardTitle>
                {c.trainerName && (
                  <p className="text-sm text-muted-foreground"><LocalizedText id="490ef6c25523" leading={""} trailing={" "} />{c.trainerName}</p>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  {formatDate(new Date(c.startsAt))} — {formatDate(new Date(c.endsAt))}
                </p>
                <p>
                  <LocalizedText id="cb680bb1a53f" leading={""} trailing={" "} />{c.bookingsCount} / {c.capacity}
                </p>
                <p className="capitalize"><LocalizedText id="11dc9e195292" leading={""} trailing={" "} />{c.status.toLowerCase()}</p>
              </CardContent>
            </Card>
          ))}
          {classes.length === 0 && (
            <p className="text-muted-foreground col-span-full">
              <LocalizedText id="df5fcbab7321" leading={""} trailing={"\n            "} /></p>
          )}
        </div>
      )}
    </div>
  );
}
