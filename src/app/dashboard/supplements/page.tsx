"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Package,
  FileText,
  ExternalLink,
  Loader2,
  Plus,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_SUPPLEMENT_HSN } from "@/lib/commerce/gst";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

type Product = {
  id: string;
  name: string;
  priceInr: string | number;
  hsnCode: string | null;
  gstRatePercent: string | number;
  amazonReferenceUrl: string | null;
};

type OrderLine = {
  id: string;
  quantity: number;
  unitPriceInr: string | number;
  Product: { name: string };
  Member: { name: string } | null;
};

export default function SupplementsPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data: productsData, mutate: mutateProducts } = useSWR<{ products: Product[] }>(
    "/api/commerce/products",
    fetcher,
  );
  const { data: linesData, mutate: mutateLines } = useSWR<{ lines: OrderLine[] }>(
    "/api/commerce/order-lines?pending=1",
    fetcher,
  );
  const { data: gstData, mutate: mutateGst } = useSWR(
    "/api/commerce/gym-gst",
    fetcher,
  );
  const { data: invoicesData } = useSWR("/api/commerce/invoices", fetcher);

  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newHsn, setNewHsn] = useState(DEFAULT_SUPPLEMENT_HSN);
  const [refUrl, setRefUrl] = useState<Record<string, string>>({});
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const products = productsData?.products?.filter(
    (p) => true,
  ) ?? [];
  const lines = linesData?.lines ?? [];
  const gymGst = gstData?.data?.gym ?? gstData?.gym;

  const saveGst = async () => {
    setBusy(true);
    try {
      await fetch("/api/commerce/gym-gst", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstin,
          invoiceLegalName: legalName,
        }),
      });
      await mutateGst();
    } finally {
      setBusy(false);
    }
  };

  const addProduct = async () => {
    if (!newName || !newPrice) return;
    setBusy(true);
    try {
      await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          category: "SUPPLEMENT",
          priceInr: Number(newPrice),
          hsnCode: newHsn,
          gstRatePercent: 18,
          priceIncludesGst: true,
        }),
      });
      setNewName("");
      setNewPrice("");
      await mutateProducts();
    } finally {
      setBusy(false);
    }
  };

  const saveReference = async (productId: string) => {
    const url = refUrl[productId]?.trim();
    setBusy(true);
    try {
      await fetch(`/api/commerce/products/${productId}/marketplace-reference`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceUrl: url || null,
        }),
      });
      await mutateProducts();
    } finally {
      setBusy(false);
    }
  };

  const issueInvoice = async () => {
    const ids = [...selectedLines];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/commerce/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderLineIds: ids, issue: true }),
      });
      const json = await res.json();
      if (res.ok) {
        const invId = json.data?.invoice?.id ?? json.invoice?.id;
        setSelectedLines(new Set());
        await mutateLines();
        if (invId) {
          window.open(`/dashboard/supplements/invoices/${invId}/print`, "_blank");
        }
      } else {
        alert(json.error?.message ?? "Could not issue invoice");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleLine = (id: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("7c63edf9a185")}
        description={tStatic("ad7edc5c7303")}
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <strong className="text-foreground"><LocalizedText id="b54a4e377913" leading={""} trailing={""} /></strong> <LocalizedText id="0b17495f4563" leading={""} trailing={"\n        "} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base"><LocalizedText id="f957146c3532" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={tStatic("74d13f6513e8")}
            value={gstin || gymGst?.gstin || ""}
            onChange={(e) => setGstin(e.target.value)}
            className="font-mono"
          />
          <Input
            placeholder={tStatic("bc46f637e2a7")}
            value={legalName || gymGst?.invoiceLegalName || ""}
            onChange={(e) => setLegalName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={saveGst} disabled={busy}>
            <LocalizedText id="efc007a393f6" leading={""} trailing={"\n          "} /></Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              <LocalizedText id="14b7fd642613" leading={""} trailing={"\n            "} /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={tStatic("63c0fe8e4bb2")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder={tStatic("1c30efad5112")}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-28"
              />
              <Input
                placeholder={tStatic("8087b8c84744")}
                value={newHsn}
                onChange={(e) => setNewHsn(e.target.value)}
                className="w-28 font-mono"
              />
              <Button size="sm" onClick={addProduct} disabled={busy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span>{formatCurrency(Number(p.priceInr))}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <Badge variant="outline"><LocalizedText id="8087b8c84744" leading={""} trailing={" "} />{p.hsnCode ?? "—"}</Badge>
                    <Badge variant="secondary">
                      <LocalizedText id="d6d11f54ee48" leading={""} trailing={" "} />{Number(p.gstRatePercent)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <LocalizedText id="aefe2bd99007" leading={""} trailing={"\n                    "} /></p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.amazon.in/dp/..."
                        value={refUrl[p.id] ?? p.amazonReferenceUrl ?? ""}
                        onChange={(e) =>
                          setRefUrl((r) => ({ ...r, [p.id]: e.target.value }))
                        }
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveReference(p.id)}
                        disabled={busy}
                      >
                        <LocalizedText id="efc007a393f6" leading={""} trailing={"\n                      "} /></Button>
                      {(refUrl[p.id] || p.amazonReferenceUrl) && (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={refUrl[p.id] || p.amazonReferenceUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base"><LocalizedText id="28a83a009a6b" leading={""} trailing={""} /></CardTitle>
            <Button
              size="sm"
              disabled={busy || selectedLines.size === 0}
              onClick={issueInvoice}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  <LocalizedText id="d0d01c8f7b3e" leading={""} trailing={""} />{selectedLines.size})
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <LocalizedText id="184619fd8f68" leading={""} trailing={""} />{" "}
                <code className="text-xs"><LocalizedText id="373f11f5ee66" leading={""} trailing={""} /></code>.
              </p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedLines.has(l.id)}
                      onChange={() => toggleLine(l.id)}
                    />
                    <span className="flex-1">
                      {l.Product.name} × {l.quantity}
                      {l.Member ? ` — ${l.Member.name}` : ""}
                    </span>
                    <span>{formatCurrency(Number(l.unitPriceInr) * l.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base"><LocalizedText id="f5fa5f1861ad" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {(invoicesData?.data?.invoices ?? invoicesData?.invoices ?? []).map(
              (inv: { id: string; invoiceNumber: string; grandTotalInr: string | number }) => (
                <li key={inv.id}>
                  <Link
                    href={`/dashboard/supplements/invoices/${inv.id}/print`}
                    className="text-primary hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  {" — "}
                  {formatCurrency(Number(inv.grandTotalInr))}
                </li>
              ),
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
