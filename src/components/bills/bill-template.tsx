"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { formatDate, formatCurrency } from "@/lib/utils";
import { APP_NAME } from "@/lib/site-config";
import Image from "next/image";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface BillTemplateProps {
  bill: {
    billNumber: string;
    programType: string;
    amount: string | null;
    paymentMethod: string;
    month: string;
    validFrom: string;
    validTo: string;
    nextPaymentDate: string | null;
    hideAmount: boolean;
    workoutPlan: string;
    member: {
      name: string;
      phone: string;
      externalId: string | null;
    };
  };
  printMode?: boolean;
}

export function BillTemplate({ bill, printMode = false }: BillTemplateProps) {
  const tStatic = useStaticUiTranslations("static");
  const billRef = useRef<HTMLDivElement>(null);
  const workoutPlan = JSON.parse(bill.workoutPlan);
  
  const downloadPDF = async () => {
    if (typeof window === 'undefined') return;
    
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    if (!billRef.current) return;
    
    // Capture the bill as canvas
    const canvas = await html2canvas(billRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // Convert to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${APP_NAME}-Receipt-${bill.billNumber}.pdf`);
  };
  
  const formatDateForBill = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <>
      {!printMode && (
        <div className="flex justify-end gap-3 mb-4">
          <Button
            type="button"
            onClick={downloadPDF}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 font-semibold active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <LocalizedText id="98e5ef062b2a" leading={""} trailing={"\n          "} /></Button>
        </div>
      )}
      <div ref={billRef} style={{
        width: '210mm',
        height: '297mm',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '5mm',
        margin: '0 auto',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '15px', 
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* Header Section */}
      <div style={{
        padding: '8px 15px',
        flex: '0 0 auto',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '10px',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '8px',
          fontSize: '7px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}>
          <LocalizedText id="0d481b97ade1" leading={""} trailing={"\n        "} /></div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 style={{
              fontSize: '24px',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '1.5px',
              marginBottom: '1px',
            }}>
              <LocalizedText id="85699b1eb5de" leading={""} trailing={"\n            "} /></h1>
            <div style={{
              fontSize: '8px',
              color: '#ffd700',
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              <LocalizedText id="3df51fbc3692" leading={""} trailing={"\n            "} /></div>
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 5px 15px rgba(255, 215, 0, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ fontSize: '20px' }}>💪</div>
            <div style={{ fontSize: '6px', color: '#1a1a1a', fontWeight: '900', letterSpacing: '0.3px' }}>
              <LocalizedText id="cfba71405018" leading={""} trailing={"\n            "} /></div>
          </div>
        </div>
      </div>

      {/* Payment Details Section */}
      <div style={{
        padding: '8px 15px',
        background: 'linear-gradient(to bottom, #f8f9fa 0%, white 100%)',
        flex: '0 0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#1a1a1a',
          marginBottom: '8px',
          letterSpacing: '1px',
          fontWeight: '900',
        }}>
          <LocalizedText id="abeb726bce8b" leading={""} trailing={"\n        "} /></h2>
        
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '900',
            color: '#667eea',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {bill.member.name}
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            marginTop: '6px',
          }}>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="89f89c02cf47" leading={""} trailing={"\n              "} /></div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a' }}>
                {bill.member.externalId || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="b37456c4530b" leading={""} trailing={"\n              "} /></div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a' }}>
                {bill.member.phone}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="9d68007b0763" leading={""} trailing={"\n              "} /></div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a' }}>
                {bill.programType.replace('_', ' ')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="88306943fea7" leading={""} trailing={"\n              "} /></div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a' }}>
                {bill.paymentMethod}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="082bc378cd60" leading={""} trailing={"\n              "} /></div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a' }}>
                {bill.month}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#666', textTransform: 'uppercase', marginBottom: '1px', fontWeight: '600' }}>
                <LocalizedText id="43dc8532f7e5" leading={""} trailing={"\n              "} /></div>
              {bill.hideAmount ? (
                <div style={{ fontSize: '9px', color: '#999', fontStyle: 'italic' }}><LocalizedText id="d4c2792a7245" leading={""} trailing={""} /></div>
              ) : (
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: '900' }}>
                  ₹{bill.amount}
                </div>
              )}
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '6px',
            borderRadius: '6px',
            marginTop: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>
              <LocalizedText id="b374b8f976c9" leading={""} trailing={" "} />{formatDateForBill(bill.validFrom)} → {formatDateForBill(bill.validTo)}
            </div>
            {bill.nextPaymentDate && (
              <div style={{ fontSize: '8px', opacity: 0.9 }}>
                <LocalizedText id="69a52c6de668" leading={""} trailing={" "} />{formatDateForBill(bill.nextPaymentDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workout Plan Section */}
      <div style={{
        padding: '8px 15px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white',
        flex: '1 1 auto',
        overflow: 'hidden',
      }}>
        <h2 style={{
          fontSize: '12px',
          fontWeight: '900',
          color: '#ffd700',
          textAlign: 'center',
          marginBottom: '6px',
          letterSpacing: '1.5px',
        }}>
          <LocalizedText id="750aed2f5b05" leading={""} trailing={"\n        "} /></h2>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '8px',
          marginBottom: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {/* Mobility/Cardio Section */}
          {(workoutPlan.MOBILITY || workoutPlan.CARDIO) && (
            <div style={{ marginBottom: '5px' }}>
              <h3 style={{
                fontSize: '9px',
                fontWeight: '700',
                color: '#ffd700',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {workoutPlan.MOBILITY ? tStatic("07df475886a1") : tStatic("d737e5fad368")}
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '3px',
              }}>
                {(workoutPlan.MOBILITY || workoutPlan.CARDIO).map((exercise: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '3px 6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '3px',
                    borderLeft: '2px solid #667eea',
                  }}>
                    <span style={{ fontSize: '7px', color: '#e0e0e0', fontWeight: '600' }}>
                      {exercise.exercise}
                    </span>
                    <span style={{ fontSize: '7px', color: '#ffd700', fontWeight: '700' }}>
                      {exercise.duration || exercise.sets}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Exercises Section */}
          {workoutPlan.EXERCISES && (
            <div>
              <h3 style={{
                fontSize: '9px',
                fontWeight: '700',
                color: '#ffd700',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <LocalizedText id="c276a4baef1c" leading={""} trailing={"\n              "} /></h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '3px',
              }}>
                {workoutPlan.EXERCISES.map((exercise: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '3px 6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '3px',
                    borderLeft: '2px solid #667eea',
                  }}>
                    <span style={{ fontSize: '7px', color: '#e0e0e0', fontWeight: '600' }}>
                      {exercise.exercise}
                    </span>
                    <span style={{ fontSize: '7px', color: '#ffd700', fontWeight: '700' }}>
                      {exercise.duration || exercise.sets}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#f8f9fa',
        padding: '6px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #e0e0e0',
        flex: '0 0 auto',
      }}>
        <div>
          <div style={{ fontSize: '6px', color: '#666', textTransform: 'uppercase', marginBottom: '1px' }}>
            <LocalizedText id="37553f8e2e5c" leading={""} trailing={"\n          "} /></div>
          <div style={{ fontSize: '8px', fontWeight: '700', color: '#1a1a1a', fontFamily: 'monospace' }}>
            {bill.billNumber}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '6px', color: '#666', textTransform: 'uppercase', marginBottom: '1px' }}>
            <LocalizedText id="72072fe97bbd" leading={""} trailing={"\n          "} /></div>
          <div style={{ fontSize: '8px', fontWeight: '700', color: '#1a1a1a', fontFamily: 'monospace' }}>
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
        <div style={{
          width: '35px',
          height: '35px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: '6px',
          textAlign: 'center',
          fontWeight: '600',
        }}>
          <LocalizedText id="c5a19955ea5d" leading={""} trailing={"\n        "} /></div>
      </div>
      
      <div style={{
        textAlign: 'center',
        padding: '4px',
        fontSize: '6px',
        color: '#999',
        background: 'white',
        flex: '0 0 auto',
      }}>
        <LocalizedText id="0817edfe10c4" leading={""} trailing={" "} />{APP_NAME}
      </div>
      </div>
    </div>
    </>
  );
}
