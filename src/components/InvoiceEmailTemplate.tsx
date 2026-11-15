import * as React from "react";

interface InvoiceEmailProps {
  tenantName: string;
  roomNo: string;
  billingMonth: string;
  rentAmount: number;
  electricityCost: number;
  waterShare: number;
  wifiShare: number;
  garbageShare: number;
  previousBalance?: number;
  totalDue: number;
  appUrl?: string;
  accountHolder?: string;
  bankName?: string;
  accountNo?: string;
}

export const InvoiceEmailTemplate: React.FC<Readonly<InvoiceEmailProps>> = ({
  tenantName,
  roomNo,
  billingMonth,
  rentAmount,
  electricityCost,
  waterShare,
  wifiShare,
  garbageShare,
  previousBalance = 0,
  totalDue,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smart-landlord-os.vercel.app",
  accountHolder = process.env.PAYMENT_ACCOUNT_HOLDER || "Dejan Thapa",
  bankName = process.env.PAYMENT_BANK_NAME || "eSewa",
  accountNo = process.env.PAYMENT_ACCOUNT_NO || "9842835084",
}) => {
  const qrUrl = `${appUrl.replace(/\/$/, "")}/payment-qr.jpg`;
  return (
    <div style={{ fontFamily: "sans-serif", color: "#333", maxWidth: "600px", margin: "0 auto", padding: "20px", border: "1px solid #eee", borderRadius: "10px" }}>
      <h2 style={{ color: "#4f46e5", textAlign: "center" }}>Monthly Rent Bill</h2>
      <p style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>{billingMonth}</p>
      
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
        <p style={{ margin: "5px 0" }}><strong>Tenant:</strong> {tenantName}</p>
        <p style={{ margin: "5px 0" }}><strong>Room No:</strong> {roomNo}</p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee" }}>
            <th style={{ textAlign: "left", padding: "10px 0" }}>Description</th>
            <th style={{ textAlign: "right", padding: "10px 0" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "10px 0" }}>Base Rent</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>Rs. {rentAmount.toLocaleString()}</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "10px 0" }}>Electricity</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>Rs. {electricityCost.toLocaleString()}</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "10px 0" }}>Water Share</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>Rs. {waterShare.toLocaleString()}</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "10px 0" }}>WiFi + Garbage</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>Rs. {(Number(wifiShare) + Number(garbageShare)).toLocaleString()}</td>
          </tr>
          {Number(previousBalance) > 0 && (
            <tr style={{ borderBottom: "1px solid #fed7aa", backgroundColor: "#fff7ed" }}>
              <td style={{ padding: "10px 6px", color: "#c2410c", fontWeight: "bold" }}>Previous Unpaid Balance</td>
              <td style={{ textAlign: "right", padding: "10px 6px", color: "#c2410c", fontWeight: "bold", fontFamily: "monospace" }}>
                Rs. {Number(previousBalance).toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: "20px 0", fontSize: "18px", fontWeight: "bold" }}>Total Due</td>
            <td style={{ textAlign: "right", padding: "20px 0", fontSize: "18px", fontWeight: "bold", color: "#4f46e5" }}>Rs. {totalDue.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "12px", padding: "20px", marginTop: "10px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#166534", fontSize: "16px" }}>Payment Instructions (eSewa)</h3>
        
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="cid:payment-qr-image" 
              alt="eSewa Payment QR" 
              width="140"
              style={{ borderRadius: "8px", border: "1px solid #dcfce7", display: "block" }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#16a34a", fontWeight: "bold", textTransform: "uppercase" }}>eSewa Payment Details</p>
            <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "16px", color: "#0f172a" }}>{accountHolder}</p>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#166534", fontWeight: "bold" }}>{bankName}</p>
            <p style={{ margin: "0", fontSize: "16px", fontFamily: "monospace", letterSpacing: "1px", fontWeight: "bold", color: "#0f172a" }}>{accountNo}</p>
          </div>
        </div>
        
        <p style={{ margin: "15px 0 0 0", fontSize: "11px", color: "#16a34a", textAlign: "center" }}>
          Please send a screenshot of the payment confirmation after transfer.
        </p>
      </div>

    <div style={{ textAlign: "center", fontSize: "12px", color: "#999", marginTop: "24px" }}>
      <p>Please contact the landlord if you have any questions.</p>
    </div>
  </div>
);
};


