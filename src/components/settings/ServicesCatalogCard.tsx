"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  Plan: { id: string; name: string }[];
}

export function ServicesCatalogCard() {
  const tStatic = useStaticUiTranslations("static");
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) setServices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createService = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle><LocalizedText id="cfc1a0f1f657" leading={""} trailing={""} /></CardTitle>
        <CardDescription><LocalizedText id="c10ec59bffee" leading={""} trailing={""} /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="serviceName"><LocalizedText id="a444057435c0" leading={""} trailing={""} /></Label>
            <Input
              id="serviceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tStatic("b25aeba8fcf5")}
              className="mt-1"
            />
          </div>
          <Button className="self-end" onClick={createService} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground"><LocalizedText id="dbf5bbf72a48" leading={""} trailing={""} /></p>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground"><LocalizedText id="21804054b087" leading={""} trailing={""} /></p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {services.map((s) => (
              <li key={s.id} className="px-4 py-3 flex justify-between gap-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.Plan.length} <LocalizedText id="bed97175b06e" leading={""} trailing={""} />{s.Plan.length === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
