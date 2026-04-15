import { useState } from "react";
import { motion } from "framer-motion";
import { useEVCharging } from "@/context/EVChargingContext";
import CyberCard from "@/components/CyberCard";
import CryptoVisualizer from "@/components/CryptoVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Users, Shield, RefreshCcw, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function GridAuthority() {
  const {
    providers,
    zones,
    franchises,
    users,
    auditLog,
    dbPath,
    registerFranchise,
    registerUser,
    refreshState,
    resetDemoData,
  } = useEVCharging();

  const [fName, setFName] = useState("");
  const [fProvider, setFProvider] = useState("");
  const [fZone, setFZone] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fBalance, setFBalance] = useState("");
  const [hashingFid, setHashingFid] = useState(false);
  const [lastFid, setLastFid] = useState("");

  const [uName, setUName] = useState("");
  const [uProvider, setUProvider] = useState("");
  const [uZone, setUZone] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uPin, setUPin] = useState("");
  const [uMobile, setUMobile] = useState("");
  const [uBalance, setUBalance] = useState("");
  const [hashingUid, setHashingUid] = useState(false);
  const [lastUid, setLastUid] = useState("");
  const [busyAction, setBusyAction] = useState<"refresh" | "reset" | null>(null);

  const handleRegisterFranchise = async () => {
    if (!fName || !fProvider || !fZone || !fPassword || !fBalance) {
      toast.error("All franchise fields are required");
      return;
    }

    try {
      setHashingFid(true);
      const franchise = await registerFranchise(fName, fZone, fProvider, fPassword, parseFloat(fBalance));
      setLastFid(franchise.fid);
      toast.success(`Franchise registered: ${franchise.fid}`);
      setFName("");
      setFPassword("");
      setFBalance("");
      setFZone("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Franchise registration failed");
    } finally {
      setHashingFid(false);
    }
  };

  const handleRegisterUser = async () => {
    if (!uName || !uProvider || !uZone || !uPassword || !uPin || !uMobile || !uBalance) {
      toast.error("All user fields are required");
      return;
    }

    try {
      setHashingUid(true);
      const user = await registerUser(uName, uZone, uProvider, uPassword, uPin, uMobile, parseFloat(uBalance));
      setLastUid(user.uid);
      toast.success(`User registered: ${user.uid}`);
      setUName("");
      setUPassword("");
      setUPin("");
      setUMobile("");
      setUBalance("");
      setUZone("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "User registration failed");
    } finally {
      setHashingUid(false);
    }
  };

  const runAdminAction = async (action: "refresh" | "reset") => {
    try {
      setBusyAction(action);
      if (action === "refresh") {
        await refreshState();
        toast.success("Backend state refreshed");
      } else {
        await resetDemoData();
        toast.success("Demo database reset and seeded");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin action failed");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 font-mono text-sm">
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-mono font-bold text-foreground mb-4">
          <Shield className="inline mr-2 text-primary" size={28} /> Grid Authority
        </motion.h1>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground mb-1">Registered Users</div>
            <div className="text-2xl text-primary">{users.length}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground mb-1">Registered Franchises</div>
            <div className="text-2xl text-primary">{franchises.length}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground mb-1">Data Store</div>
            <div className="text-xs text-cyber break-all">{dbPath || "Connecting..."}</div>
          </div>
        </div>

        <Tabs defaultValue="franchise">
          <TabsList className="bg-muted mb-6">
            <TabsTrigger value="franchise" className="font-mono">
              <Building2 size={14} className="mr-1" /> Franchise
            </TabsTrigger>
            <TabsTrigger value="user" className="font-mono">
              <Users size={14} className="mr-1" /> User
            </TabsTrigger>
            <TabsTrigger value="accounts" className="font-mono">Accounts</TabsTrigger>
            <TabsTrigger value="audit" className="font-mono">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="franchise">
            <div className="grid md:grid-cols-2 gap-6">
              <CyberCard title="Register Franchise" icon={<Building2 size={20} />}>
                <div className="space-y-3">
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Franchise Name</Label>
                    <Input value={fName} onChange={(e) => setFName(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Energy Provider</Label>
                    <Select value={fProvider} onValueChange={(value) => { setFProvider(value); setFZone(""); }}>
                      <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select provider" /></SelectTrigger>
                      <SelectContent>{providers.map((provider) => <SelectItem key={provider} value={provider}>{provider}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {fProvider && (
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">Zone Code</Label>
                      <Select value={fZone} onValueChange={setFZone}>
                        <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select zone" /></SelectTrigger>
                        <SelectContent>{zones[fProvider]?.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Password</Label>
                    <Input type="password" value={fPassword} onChange={(e) => setFPassword(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Initial Balance (INR)</Label>
                    <Input type="number" value={fBalance} onChange={(e) => setFBalance(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <Button onClick={handleRegisterFranchise} disabled={hashingFid} className="w-full font-mono">
                    {hashingFid ? "Generating FID..." : "Register Franchise"}
                  </Button>
                </div>
              </CyberCard>

              <div className="space-y-4">
                <CryptoVisualizer input={fName + fPassword} output={lastFid} algorithm="SHA-3" isActive={hashingFid} />
                {lastFid && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-primary/30 bg-muted/50 p-4">
                    <div className="text-xs font-mono text-muted-foreground mb-1">Generated Franchise ID</div>
                    <div className="text-lg font-mono text-primary break-all">{lastFid}</div>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="user">
            <div className="grid md:grid-cols-2 gap-6">
              <CyberCard title="Register EV Owner" icon={<Users size={20} />}>
                <div className="space-y-3">
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Full Name</Label>
                    <Input value={uName} onChange={(e) => setUName(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Energy Provider</Label>
                    <Select value={uProvider} onValueChange={(value) => { setUProvider(value); setUZone(""); }}>
                      <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select provider" /></SelectTrigger>
                      <SelectContent>{providers.map((provider) => <SelectItem key={provider} value={provider}>{provider}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {uProvider && (
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">Zone Code</Label>
                      <Select value={uZone} onValueChange={setUZone}>
                        <SelectTrigger className="bg-muted border-border font-mono"><SelectValue placeholder="Select zone" /></SelectTrigger>
                        <SelectContent>{zones[uProvider]?.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Password</Label>
                    <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">PIN (4-digit)</Label>
                    <Input maxLength={4} value={uPin} onChange={(e) => setUPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Mobile Number</Label>
                    <Input value={uMobile} onChange={(e) => setUMobile(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">Initial Balance (INR)</Label>
                    <Input type="number" value={uBalance} onChange={(e) => setUBalance(e.target.value)} className="bg-muted border-border font-mono" />
                  </div>
                  <Button onClick={handleRegisterUser} disabled={hashingUid} className="w-full font-mono">
                    {hashingUid ? "Generating UID..." : "Register User"}
                  </Button>
                </div>
              </CyberCard>

              <div className="space-y-4">
                <CryptoVisualizer input={uName + uPassword} output={lastUid} algorithm="SHA-3" isActive={hashingUid} />
                {lastUid && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-primary/30 bg-muted/50 p-4">
                    <div className="text-xs font-mono text-muted-foreground mb-1">Generated User ID</div>
                    <div className="text-lg font-mono text-primary break-all">{lastUid}</div>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="grid md:grid-cols-2 gap-6">
              <CyberCard title="Registered Franchises" icon={<Building2 size={20} />}>
                {franchises.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No franchises registered yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {franchises.map((franchise) => (
                      <div key={franchise.fid} className="rounded border border-border p-3 bg-muted/30">
                        <div className="font-mono text-sm font-semibold text-foreground">{franchise.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">FID: {franchise.fid}</div>
                        <div className="text-xs text-muted-foreground font-mono">{franchise.provider} | {franchise.zoneCode}</div>
                        <div className="text-xs text-primary font-mono">Balance: INR {franchise.balance.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CyberCard>

              <CyberCard title="Registered Users" icon={<Users size={20} />} glowColor="blue">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No users registered yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {users.map((user) => (
                      <div key={user.uid} className="rounded border border-border p-3 bg-muted/30">
                        <div className="font-mono text-sm font-semibold text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">UID: {user.uid}</div>
                        <div className="text-xs text-muted-foreground font-mono">VMID: {user.vmid}</div>
                        <div className="text-xs text-muted-foreground font-mono">{user.provider} | {user.zoneCode}</div>
                        <div className="text-xs text-primary font-mono">Balance: INR {user.balance.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CyberCard>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
              <CyberCard title="Audit Log" icon={<Database size={20} />} glowColor="teal">
                {auditLog.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No audit events yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[28rem] overflow-auto">
                    {[...auditLog].reverse().map((entry, index) => (
                      <div key={`${entry.time}-${index}`} className="rounded border border-border bg-muted/30 p-3">
                        <div className="text-xs text-cyber font-mono">{entry.time}</div>
                        <div className="text-sm text-foreground font-mono mt-1">{entry.event}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CyberCard>

              <CyberCard title="Admin Controls" icon={<RefreshCcw size={20} />} glowColor="purple">
                <div className="space-y-4">
                  <Button onClick={() => void runAdminAction("refresh")} disabled={busyAction !== null} className="w-full font-mono">
                    <RefreshCcw size={16} className="mr-2" />
                    {busyAction === "refresh" ? "Refreshing..." : "Reload Backend State"}
                  </Button>
                  <Button onClick={() => void runAdminAction("reset")} disabled={busyAction !== null} variant="outline" className="w-full font-mono">
                    <Database size={16} className="mr-2" />
                    {busyAction === "reset" ? "Resetting..." : "Reset Demo Database"}
                  </Button>
                </div>
              </CyberCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
