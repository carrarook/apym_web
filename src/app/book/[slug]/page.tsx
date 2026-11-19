"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PublicBookPage() {
  const tStatic = useStaticUiTranslations("static");
  const params = useParams();
  const slug = params.slug as string;
  const [gymName, setGymName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/book-trial?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.gym?.name) setGymName(j.data.gym.name);
        else if (j.gym?.name) setGymName(j.gym.name);
      })
      .catch(() => null);
  }, [slug]);

  const submit = async (bookTrial: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/book-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          phone,
          email: email || undefined,
          bookTrial,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? tStatic("fb6619fb8aba"));
        return;
      }
      setDone(true);
      if (json.data?.gymName) setGymName(json.data.gymName);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle><LocalizedText id="184eb63a906e" leading={""} trailing={""} /></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {gymName ?? tStatic("86aab2d7dc4d")} <LocalizedText id="5451213e4891" leading={""} trailing={"\n            "} /></p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle><LocalizedText id="8bb16c9cf566" leading={""} trailing={""} /></CardTitle>
          <p className="text-sm text-muted-foreground">
            {gymName ? gymName : tStatic("46fa9feaa640")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder={tStatic("ab42293e29e1")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={tStatic("b11a8962603d")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder={tStatic("5c10b588a954")} value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={loading || !name || phone.length < 10}
            onClick={() => submit(true)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tStatic("9f2e08b5d286")}
          </Button>
          <Button variant="outline" className="w-full" disabled={loading} onClick={() => submit(false)}>
            <LocalizedText id="d39023e53b13" leading={""} trailing={"\n          "} /></Button>
        </CardContent>
      </Card>
    </div>
  );
}
