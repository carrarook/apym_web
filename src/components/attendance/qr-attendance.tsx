'use client';

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const logger = createLogger("app");

interface QRAttendanceProps {
  memberId: string;
  memberName: string;
}

export function QRAttendance({ memberId, memberName }: QRAttendanceProps) {
  const tStatic = useStaticUiTranslations("static");
  const [qrData, setQrData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanTestValue, setScanTestValue] = useState('');

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance/qr?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to generate QR code');
      
      const data = await response.json();
      setQrData(data.qrData);
    } catch (error) {
      logger.error('Error generating QR code:', error as Error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async (qrCodeData: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendance/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: qrCodeData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record attendance');
      }
      
      const data = await response.json();
      setScanResult(data);
      
      // Clear result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    } catch (error: unknown) {
      logger.error('Error recording attendance:', error as Error);
      alert(error instanceof Error ? error.message : String(error) || 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <h3 className="text-lg font-semibold mb-4"><LocalizedText id="c544fd824551" leading={""} trailing={""} /></h3>
        
        <div className="space-y-4">
          {/* Generate QR Code Section */}
          <div>
            <Button
              type="button"
              onClick={generateQRCode}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? tStatic("81362292e8ba") : tStatic("85173666f3c7")}
            </Button>
          </div>

          {/* Display QR Code */}
          {qrData && (
            <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <div className="text-center mb-2">
                <p className="font-semibold">{memberName}</p>
                <p className="text-sm text-muted-foreground"><LocalizedText id="6b0e3d9b0eea" leading={""} trailing={""} /></p>
              </div>
              
              {/* In a real implementation, you would use a QR code library like qrcode.react */}
              <div className="bg-background p-4 rounded flex items-center justify-center min-h-[200px] border border-border">
                <div className="text-center">
                  <div className="text-6xl mb-2">📱</div>
                  <p className="text-sm text-muted-foreground"><LocalizedText id="b6350b836ab0" leading={""} trailing={""} /></p>
                  <p className="text-xs text-muted-foreground mt-2"><LocalizedText id="825a8552b7e8" leading={""} trailing={""} /></p>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground break-all">
                <strong><LocalizedText id="08f0f7caa706" leading={""} trailing={""} /></strong> {qrData}
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className={`p-4 rounded-lg ${
              scanResult.action === 'checkin' 
                ? 'bg-green-500/10 border-2 border-green-500/30 dark:bg-green-500/20' 
                : 'bg-yellow-500/10 border-2 border-yellow-500/30 dark:bg-yellow-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {scanResult.action === 'checkin' ? '✅' : '👋'}
                </span>
                <div>
                  <p className="font-semibold">{scanResult.message}</p>
                  <p className="text-sm">{scanResult.member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(scanResult.attendance.checkIn)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm"><LocalizedText id="8e090d332d9d" leading={""} trailing={""} /></h4>
            <ol className="text-sm text-foreground space-y-1 list-decimal list-inside">
              <li><LocalizedText id="349509121baf" leading={""} trailing={""} /></li>
              <li><LocalizedText id="840c1a2c34f0" leading={""} trailing={""} /></li>
              <li><LocalizedText id="112245132b96" leading={""} trailing={""} /></li>
              <li><LocalizedText id="e5e78070990f" leading={""} trailing={""} /></li>
            </ol>
          </div>
        </div>
      </div>

      {/* Quick Scan Input (for testing) */}
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <h4 className="font-semibold mb-3"><LocalizedText id="d9747c745a47" leading={""} trailing={""} /></h4>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder={tStatic("02c8b1d4e096")}
            className="flex-1 p-2 border rounded"
            value={scanTestValue}
            onChange={(e) => setScanTestValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && scanTestValue) {
                scanQRCode(scanTestValue);
                setScanTestValue('');
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (scanTestValue) {
                scanQRCode(scanTestValue);
                setScanTestValue('');
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <LocalizedText id="28cba55d2aad" leading={""} trailing={"\n          "} /></Button>
        </div>
      </div>
    </div>
  );
}
