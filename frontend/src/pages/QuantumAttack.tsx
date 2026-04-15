import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEVCharging, type QuantumAttackResult } from "@/context/EVChargingContext";
import CyberCard from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertTriangle, Atom } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function QuantumAttack() {
  const { users, simulateShorAttack } = useEVCharging();
  const [selectedVmid, setSelectedVmid] = useState("");
  const [attacking, setAttacking] = useState(false);
  const [result, setResult] = useState<QuantumAttackResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [steps, setSteps] = useState<string[]>([]);

  const safeJoin = (values: number[] | undefined) => Array.isArray(values) ? values.join(", ") : "Unavailable";
  const safeText = (value: string | undefined, fallback = "Unavailable") => value && value.length > 0 ? value : fallback;

  const buildSteps = (demo: QuantumAttackResult) => [
    `Step 1: Intercept public key (e, n) = (${demo.public_key[0]}, ${demo.public_key[1]})`,
    `Step 1A: Capture selected user's ciphertext bundles for VMID and PIN`,
    `Step 2: Recover period r = ${demo.period_r} using Shor-style period finding`,
    `Step 3: Factor modulus into p = ${demo.recovered_p} and q = ${demo.recovered_q}`,
    `Step 4: Reconstruct private key d = ${demo.cracked_private_key[0]}`,
    `Step 5: Decrypt the VMID ciphertext to recover ${safeText(demo.stolen_vmid, "the selected VMID")}`,
    `Step 6: Decrypt the PIN ciphertext to recover ${safeText(demo.stolen_pin, "the selected PIN")}`,
    demo.matches_original_private_key ? "Step 7: Private key fully recovered - selected user credentials exposed" : "Step 7: Partial recovery only",
  ];

  const handleAttack = async () => {
    if (!users.length) {
      toast.error("Register a user before running the quantum demo");
      return;
    }

    try {
      setAttacking(true);
      setResult(null);
      setVisibleSteps(0);

      const demo = await simulateShorAttack(selectedVmid || users[0].vmid);
      const generatedSteps = buildSteps(demo);
      setResult(demo);
      setSteps(generatedSteps);

      generatedSteps.forEach((_, index) => {
        window.setTimeout(() => setVisibleSteps(index + 1), (index + 1) * 700);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quantum demo failed");
    } finally {
      window.setTimeout(() => setAttacking(false), 700 * 8);
    }
  };

  const selectedUser = users.find((user) => user.vmid === (selectedVmid || users[0]?.vmid));

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 font-mono text-sm">
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-mono font-bold text-foreground mb-2">
          <Shield className="inline mr-2 text-quantum" size={28} /> Quantum Vulnerability Demo
        </motion.h1>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          Simulating a Shor-style attack against the toy RSA exchange used to protect EV owner credentials.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <CyberCard title="RSA Exchange Target" icon={<Shield size={20} />} glowColor="purple">
            <div className="space-y-3 font-mono text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Select Registered User</div>
                <Select value={selectedVmid} onValueChange={setSelectedVmid}>
                  <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Pick a user VMID" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.vmid} value={user.vmid}>
                        {user.name} ({user.vmid.slice(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser && (
                <div className="rounded border border-border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Chosen EV Owner</div>
                  <div className="text-foreground">{selectedUser.name}</div>
                  <div className="text-xs text-cyber mt-1 break-all">VMID: {selectedUser.vmid}</div>
                </div>
              )}
              <div className="rounded border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Toy RSA Modulus</div>
                <div className="text-foreground">n = {result?.public_key?.[1] ?? "Pending attack..."}</div>
              </div>
              <div className="rounded border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Public Exponent</div>
                <div className="text-foreground">e = {result?.public_key?.[0] ?? "Pending attack..."}</div>
              </div>
              <Button onClick={() => void handleAttack()} disabled={attacking || users.length === 0} className="w-full font-mono bg-quantum hover:bg-quantum/80 text-accent-foreground">
                <Atom size={16} className="mr-2" />
                {attacking ? "Running Shor Simulation..." : "Launch Quantum Attack"}
              </Button>
            </div>
          </CyberCard>

          <div className="space-y-4">
            <CyberCard title="Attack Trace" icon={<Atom size={20} />} glowColor="purple">
              <AnimatePresence>
                {steps.length > 0 && (
                  <div className="space-y-2">
                    {steps.slice(0, visibleSteps).map((step, index) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-xs font-mono p-2 rounded border ${
                          index === steps.length - 1
                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                            : index >= steps.length - 2
                            ? "border-warning-amber/50 bg-warning-amber/10 text-warning-amber"
                            : "border-border bg-muted/30 text-foreground"
                        }`}
                      >
                        {step}
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {!steps.length && !attacking && (
                <p className="text-muted-foreground text-sm">Launch the demo to show how the toy RSA exchange can be factored and reversed.</p>
              )}
            </CyberCard>

            {result && (
              <CyberCard title="Captured User Data" icon={<Shield size={20} />} glowColor="blue">
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Selected user:</span><span className="text-foreground text-right">{selectedUser?.name || "Unknown"}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Original VMID:</span><span className="text-cyber text-right break-all">{safeText(result.original_vmid)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Original PIN:</span><span className="text-cyber">{safeText(result.original_pin)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reduced VMID hash:</span><span className="text-foreground">{result.vmid_small}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reduced PIN value:</span><span className="text-foreground">{result.pin_small}</span></div>
                  <div className="rounded border border-border bg-muted/20 p-3">
                    <div className="text-muted-foreground mb-1">Encrypted VMID bytes</div>
                    <div className="text-foreground break-all">{safeJoin(result.enc_vmid)}</div>
                  </div>
                  <div className="rounded border border-border bg-muted/20 p-3">
                    <div className="text-muted-foreground mb-1">Encrypted PIN bytes</div>
                    <div className="text-foreground break-all">{safeJoin(result.enc_pin)}</div>
                  </div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Recovered VMID:</span><span className="text-primary text-right break-all">{safeText(result.stolen_vmid)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Recovered PIN:</span><span className="text-primary">{safeText(result.stolen_pin)}</span></div>
                </div>
              </CyberCard>
            )}

            {result && visibleSteps >= steps.length && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <CyberCard title="Vulnerability Report" icon={<AlertTriangle size={20} />} glowColor="purple">
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle size={16} /> Classical RSA exchange is vulnerable in this demo
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Factors found: p = {result.recovered_p}, q = {result.recovered_q}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Private key recovered: d = {result.cracked_private_key[0]}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Attack outcome: selected user's VMID and PIN are fully reconstructed from the intercepted ciphertext.
                    </div>
                    <div className="rounded border border-primary/30 bg-primary/5 p-3 mt-3">
                      <div className="text-primary text-xs font-semibold mb-1">Mitigation</div>
                      <div className="text-muted-foreground text-xs">
                        Replace RSA-based exchange with a post-quantum alternative such as Kyber, while keeping ASCON and blockchain for the kiosk and ledger layers.
                      </div>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
