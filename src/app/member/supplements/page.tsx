"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect } from "react";
import { ExternalLink, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  priceInr: number;
  hsnCode: string | null;
  gstRatePercent: number;
  hasReferenceLink: boolean;
  referenceDisclaimer: string;
};

export default function MemberSupplementsPage() {
  const tStatic = useStaticUiTranslations("static");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<
    { id: string; invoiceNumber: string; grandTotalInr: number }[]
  >([]);
  const [refLoading, setRefLoading] = useState<string | null>(null);
  const [openRef, setOpenRef] = useState<{
    url: string;
    disclaimer: string;
    productName: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/member/supplements")
      .then((r) => r.json())
      .then((j) => {
        const d = j.data ?? j;
        setProducts(d.products ?? []);
        setInvoices(
          (d.invoices ?? []).map(
            (inv: { id: string; invoiceNumber: string; grandTotalInr: string | number }) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              grandTotalInr: Number(inv.grandTotalInr),
            }),
          ),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const openReference = async (productId: string, productName: string) => {
    setRefLoading(productId);
    try {
      const res = await fetch(`/api/member/supplements/${productId}/reference`);
      const j = await res.json();
      const d = j.data ?? j;
      if (d.referenceUrl) {
        setOpenRef({
          url: d.referenceUrl,
          disclaimer: d.disclaimer ?? d.referenceDisclaimer ?? "",
          productName,
        });
      } else {
        alert(d.message ?? "No reference link on file. Ask the front desk.");
      }
    } finally {
      setRefLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold"><LocalizedText id="7c63edf9a185" leading={""} trailing={""} /></h1>
      <p className="text-sm text-muted-foreground">
        <LocalizedText id="57e5adddc7a3" leading={""} trailing={"\n      "} /></p>

      {openRef && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{openRef.productName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{openRef.disclaimer}</p>
            <Button asChild className="w-full">
              <a href={openRef.url} target="_blank" rel="noopener noreferrer">
                <LocalizedText id="29de7fcf4fc8" leading={""} trailing={"\n                "} /><ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpenRef(null)}>
              <LocalizedText id="bbfa773e5a63" leading={""} trailing={"\n            "} /></Button>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="border rounded-lg p-3">
            <div className="flex justify-between">
              <span className="font-medium">{p.name}</span>
              <span>{formatCurrency(p.priceInr)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <LocalizedText id="8087b8c84744" leading={""} trailing={" "} />{p.hsnCode ?? "—"} <LocalizedText id="59353faea606" leading={""} trailing={" "} />{p.gstRatePercent}%
            </p>
            {p.hasReferenceLink && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                disabled={refLoading === p.id}
                onClick={() => openReference(p.id, p.name)}
              >
                {refLoading === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  tStatic("9045e01588fa")
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <LocalizedText id="fe23ff379537" leading={""} trailing={"\n            "} /></CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {invoices.map((inv) => (
              <p key={inv.id}>
                {inv.invoiceNumber} — {formatCurrency(inv.grandTotalInr)}
              </p>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              <LocalizedText id="703d31e75ebd" leading={""} trailing={"\n            "} /></p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
