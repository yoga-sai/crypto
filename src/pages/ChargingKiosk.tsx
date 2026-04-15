import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEVCharging } from "@/context/EVChargingContext";
import CyberCard from "@/components/CyberCard";
import CryptoVisualizer from "@/components/CryptoVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, QrCode, CreditCard, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import type { Transaction } from "@/context/EVChargingContext";

type KioskStep = "select" | "qr" | "payment" | "processing" | "result";

export default function ChargingKiosk() {
  const { franchises, users, generateVFID, processTransaction } = useEVCharging();

  const [step, setStep] = useState<KioskStep>("select");
  const [selectedFid, setSelectedFid] = useState("");
  const [vfidData, setVfidData] = useState<{ vfid: string; encrypted: string; franchiseName?: string } | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [vmid, setVmid] = useState("");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Transaction | null>(null);

  const handleGenerateQR = async () => {
    if (!selectedFid) {
      toast.error("Select a franchise first");
      return;
    }

    try {
      setEncrypting(true);
      const data = await generateVFID(selectedFid);
      setVfidData(data);
      setStep("qr");
      toast.success("Encrypted station payload generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR generation failed");
    } finally {
      setEncrypting(false);
    }
  };

  const handleScanQR = () => setStep("payment");

  const handlePayment = async () => {
    if (!vmid || !pin || !amount || !vfidData) {
      toast.error("All payment fields are required");
      return;
    }

    try {
      setStep("processing");
      const transaction = await processTransaction(vmid, pin, parseFloat(amount), vfidData.encrypted);
      setResult(transaction);
      setStep("result");

      if (transaction.status === "success") {
        toast.success("Payment successful and charging unlocked");
      } else if (transaction.status === "refund") {
        toast.warning("Payment reversed because hardware failed");
      } else {
        toast.error(transaction.message || "Transaction failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setStep("payment");
    }
  };

  const reset = () => {
    setStep("select");
    setSelectedFid("");
    setVfidData(null);
    setVmid("");
    setPin("");
    setAmount("");
    setResult(null);
  };

  const selectedFranchise = franchises.find((franchise) => franchise.fid === selectedFid);
  const resultTitle =
    result?.status === "success" ? "Payment Successful" : result?.status === "refund" ? "Refund Issued" : "Payment Failed";
  const ResultIcon = result?.status === "success" ? CheckCircle : result?.status === "refund" ? AlertTriangle : XCircle;
  const resultGlow = result?.status === "success" ? "green" : result?.status === "refund" ? "teal" : "purple";

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 font-mono text-sm">
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-mono font-bold text-foreground mb-2">
          <Zap className="inline mr-2 text-cyber" size={28} /> Charging Kiosk
        </motion.h1>

        <div className="flex gap-2 mb-8">
          {(["select", "qr", "payment", "processing", "result"] as KioskStep[]).map((value, index, allSteps) => (
            <div
              key={value}
              className={`h-1 flex-1 rounded-full transition-colors ${
                allSteps.indexOf(step) >= index ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid md:grid-cols-2 gap-6">
                <CyberCard title="Select Franchise" icon={<QrCode size={20} />} glowColor="blue">
                  {franchises.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No franchises registered. Go to <Link to="/grid" className="text-primary underline">Grid Authority</Link> first.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <Select value={selectedFid} onValueChange={setSelectedFid}>
                        <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select station" /></SelectTrigger>
                        <SelectContent>
                          {franchises.map((franchise) => (
                            <SelectItem key={franchise.fid} value={franchise.fid}>
                              {franchise.name} ({franchise.zoneCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => void handleGenerateQR()} disabled={encrypting} className="w-full font-mono">
                        {encrypting ? "Encrypting with ASCON..." : "Generate QR Code"}
                      </Button>
                    </div>
                  )}
                </CyberCard>

                <CryptoVisualizer input={selectedFid} output={vfidData?.encrypted || ""} algorithm="ASCON" isActive={encrypting} />
              </div>
            </motion.div>
          )}

          {step === "qr" && vfidData && (
            <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CyberCard title="Station QR Code" icon={<QrCode size={20} />} glowColor="blue" className="max-w-md mx-auto text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-foreground rounded-lg inline-block">
                    <QRCodeSVG value={vfidData.encrypted} size={200} bgColor="hsl(160, 10%, 90%)" fgColor="hsl(220, 20%, 6%)" />
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    <div>Encrypted payload:</div>
                    <div className="text-cyber break-all mt-1">{vfidData.encrypted}</div>
                  </div>
                  <Button onClick={handleScanQR} className="font-mono">
                    <Zap size={16} className="mr-2" /> Scan QR and Start Payment
                  </Button>
                </div>
              </CyberCard>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid md:grid-cols-2 gap-6">
                <CyberCard title="EV Owner Payment" icon={<CreditCard size={20} />} glowColor="green">
                  <div className="space-y-3">
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">VMID</Label>
                      {users.length > 0 ? (
                        <Select value={vmid} onValueChange={setVmid}>
                          <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select user VMID" /></SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.vmid} value={user.vmid}>
                                {user.name} - {user.vmid.slice(0, 8)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={vmid} onChange={(e) => setVmid(e.target.value)} className="bg-muted border-border font-mono" placeholder="Enter VMID" />
                      )}
                    </div>
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">PIN</Label>
                      <Input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="bg-muted border-border font-mono" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">Charging Amount (INR)</Label>
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted border-border font-mono" />
                    </div>
                    <Button onClick={() => void handlePayment()} className="w-full font-mono">
                      <Zap size={16} className="mr-2" /> Authorize Payment
                    </Button>
                  </div>
                </CyberCard>

                <div className="rounded-md border border-border bg-muted/30 p-4">
                  <div className="text-xs font-mono text-muted-foreground mb-2">Station Info</div>
                  <div className="text-sm font-mono text-foreground">{vfidData?.franchiseName || selectedFranchise?.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-2">FID: {selectedFranchise?.fid}</div>
                  <div className="text-xs font-mono text-cyber mt-2 break-all">Encrypted FID: {vfidData?.encrypted}</div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <Zap size={64} className="text-primary mx-auto" />
              </motion.div>
              <p className="text-foreground font-mono mt-4">Processing transaction...</p>
              <p className="text-muted-foreground font-mono text-sm mt-2">
                Decrypting station QR, validating VMID and PIN, then recording the blockchain outcome
              </p>
            </motion.div>
          )}

          {step === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <CyberCard title={resultTitle} icon={<ResultIcon size={20} />} glowColor={resultGlow} className="max-w-lg mx-auto">
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">TX ID:</span><span className="text-foreground text-right break-all">{result.id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="text-primary">INR {result.amount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">User:</span><span className="text-foreground">{result.userName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Station:</span><span className="text-foreground">{result.franchiseName}</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={result.status === "success" ? "text-primary" : result.status === "refund" ? "text-cyber" : "text-destructive"}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  {result.message && (
                    <div className="rounded border border-border bg-muted/30 p-3 mt-3 text-xs text-foreground">
                      {result.message}
                    </div>
                  )}
                  {typeof result.userBalance === "number" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">User Balance:</span><span className="text-foreground">INR {result.userBalance.toFixed(2)}</span></div>
                  )}
                  {typeof result.franchiseBalance === "number" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Franchise Balance:</span><span className="text-foreground">INR {result.franchiseBalance.toFixed(2)}</span></div>
                  )}
                </div>
                <Button onClick={reset} variant="outline" className="w-full mt-4 font-mono">New Session</Button>
              </CyberCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
