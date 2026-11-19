"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import { formatCurrency } from "@/lib/utils";

export type SupplementInvoiceView = {
  invoiceNumber: string;
  issuedAt: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerGstin: string | null;
  taxableTotalInr: number;
  cgstTotalInr: number;
  sgstTotalInr: number;
  igstTotalInr: number;
  grandTotalInr: number;
  placeOfSupplyState: string | null;
  notes: string | null;
  seller: {
    name: string;
    legalName: string | null;
    gstin: string | null;
    address: string | null;
    phone: string | null;
    stateCode: string | null;
  };
  lines: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unitPriceInr: number;
    gstRatePercent: number;
    taxableValueInr: number;
    cgstInr: number;
    sgstInr: number;
    lineTotalInr: number;
  }>;
};

export function SupplementGstInvoiceTemplate({
  invoice,
}: {
  invoice: SupplementInvoiceView;
}) {
  const sellerName = invoice.seller.legalName ?? invoice.seller.name;

  return (
    <div className="max-w-2xl mx-auto p-6 text-sm text-foreground print:p-4">
      <header className="border-b pb-4 mb-4">
        <h1 className="text-lg font-bold"><LocalizedText id="73068d081484" leading={""} trailing={""} /></h1>
        <p className="font-semibold mt-2">{sellerName}</p>
        {invoice.seller.gstin && (
          <p><LocalizedText id="036816120c85" leading={""} trailing={" "} />{invoice.seller.gstin}</p>
        )}
        {invoice.seller.address && <p>{invoice.seller.address}</p>}
        {invoice.seller.phone && <p><LocalizedText id="daeea4d0cc37" leading={""} trailing={" "} />{invoice.seller.phone}</p>}
      </header>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-muted-foreground text-xs"><LocalizedText id="ff0dda2fcd3d" leading={""} trailing={""} /></p>
          <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs"><LocalizedText id="eb9a4bc1c0c1" leading={""} trailing={""} /></p>
          <p>
            {invoice.issuedAt
              ? new Date(invoice.issuedAt).toLocaleDateString("en-IN")
              : "—"}
          </p>
        </div>
        {invoice.buyerName && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs"><LocalizedText id="4186c93a90f9" leading={""} trailing={""} /></p>
            <p>
              {invoice.buyerName}
              {invoice.buyerPhone ? ` · ${invoice.buyerPhone}` : ""}
            </p>
            {invoice.buyerGstin && <p><LocalizedText id="036816120c85" leading={""} trailing={" "} />{invoice.buyerGstin}</p>}
          </div>
        )}
        {invoice.placeOfSupplyState && (
          <div>
            <p className="text-muted-foreground text-xs"><LocalizedText id="c95282427368" leading={""} trailing={""} /></p>
            <p><LocalizedText id="a72502067518" leading={""} trailing={" "} />{invoice.placeOfSupplyState}</p>
          </div>
        )}
      </div>

      <table className="w-full border text-xs mb-4">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-2 text-left"><LocalizedText id="ecdda59aea5e" leading={""} trailing={""} /></th>
            <th className="p-2"><LocalizedText id="8087b8c84744" leading={""} trailing={""} /></th>
            <th className="p-2"><LocalizedText id="1e5ff9e500c2" leading={""} trailing={""} /></th>
            <th className="p-2 text-right"><LocalizedText id="addd568c75b2" leading={""} trailing={""} /></th>
            <th className="p-2 text-right"><LocalizedText id="20b88e574595" leading={""} trailing={""} /></th>
            <th className="p-2 text-right"><LocalizedText id="6b1e3b6e5586" leading={""} trailing={""} /></th>
            <th className="p-2 text-right"><LocalizedText id="b25928c69902" leading={""} trailing={""} /></th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">
                {line.description}
                <span className="text-muted-foreground block">
                  @{line.gstRatePercent}<LocalizedText id="63a28c0c81b9" leading={""} trailing={"\n                "} /></span>
              </td>
              <td className="p-2 text-center">{line.hsnCode}</td>
              <td className="p-2 text-center">{line.quantity}</td>
              <td className="p-2 text-right">
                {formatCurrency(line.taxableValueInr)}
              </td>
              <td className="p-2 text-right">{formatCurrency(line.cgstInr)}</td>
              <td className="p-2 text-right">{formatCurrency(line.sgstInr)}</td>
              <td className="p-2 text-right font-medium">
                {formatCurrency(line.lineTotalInr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-3 space-y-1 text-right">
        <p><LocalizedText id="3a690b393fee" leading={""} trailing={" "} />{formatCurrency(invoice.taxableTotalInr)}</p>
        <p><LocalizedText id="76cbf5f808e3" leading={""} trailing={" "} />{formatCurrency(invoice.cgstTotalInr)}</p>
        <p><LocalizedText id="0a308e74bd7f" leading={""} trailing={" "} />{formatCurrency(invoice.sgstTotalInr)}</p>
        {invoice.igstTotalInr > 0 && (
          <p><LocalizedText id="29b1f88c43b8" leading={""} trailing={" "} />{formatCurrency(invoice.igstTotalInr)}</p>
        )}
        <p className="text-base font-bold">
          <LocalizedText id="e4c899f79c37" leading={""} trailing={" "} />{formatCurrency(invoice.grandTotalInr)}
        </p>
      </div>

      {invoice.notes && (
        <p className="mt-4 text-xs text-muted-foreground">{invoice.notes}</p>
      )}

      <p className="mt-6 text-[10px] text-muted-foreground">
        <LocalizedText id="44783e81704d" leading={""} trailing={"\n      "} /></p>
    </div>
  );
}
