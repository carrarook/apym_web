"use client";

import { Suspense, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Loader2, ExternalLink } from "lucide-react";

function MemberPayContent() {
  const { translate } = useLocale();
  const params = useSearchParams();
  const memberId = params.get("memberId");
  const gymId = params.get("gymId");
  const payToken = params.get("payToken");
  const demo = params.get("demo") === "1";

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    if (!gymId || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/member/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(translate("member.pay.otpFailed"));
        return;
      }
      setOtpSent(true);
      if (json.data?.devCode) {
        setOtpCode(json.data.devCode);
      }
    } finally {
      setLoading(false);
    }
  };

  const payNow = async () => {
    if (!memberId || !gymId || !payToken) {
      setError(translate("member.pay.missingData"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (otpSent && otpCode.length === 6) {
        const verify = await fetch("/api/member/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gymId, phone, code: otpCode }),
        });
        if (!verify.ok) {
          setError(translate("member.pay.invalidOtp"));
          return;
        }
      }

      const res = await fetch("/api/public/member-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId, memberId, payToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(translate("member.pay.paymentLinkFailed"));
        return;
      }
      const url = json.data?.checkoutUrl ?? json.checkoutUrl;
      if (url) {
        setCheckoutUrl(url);
        if (url.startsWith("http")) {
          window.location.href = url;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold">{translate("member.pay.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {translate("member.pay.description")}
      </p>
      {demo && (
        <p className="rounded-md bg-muted p-3 text-sm">
          {translate("member.pay.demo")}
        </p>
      )}

      {!memberId || !gymId || !payToken ? (
        <p className="text-sm text-destructive">
          {translate("member.pay.signedLink")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{translate("member.pay.verifyPhone")}</p>
            <Input
              placeholder={translate("member.pay.registeredPhone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {!otpSent ? (
              <Button variant="outline" className="w-full" onClick={sendOtp} disabled={loading}>
                {translate("member.pay.sendCode")}
              </Button>
            ) : (
              <Input
                placeholder={translate("member.pay.codePlaceholder")}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            )}
          </div>
          <Button className="w-full" onClick={payNow} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {translate("member.pay.payWith")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          {checkoutUrl && !checkoutUrl.startsWith("http") && (
            <p className="text-xs text-muted-foreground">
              {translate("member.pay.demoCheckout")}: {checkoutUrl}
            </p>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default function MemberPayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MemberPayContent />
    </Suspense>
  );
}
