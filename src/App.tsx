import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EVChargingProvider } from "@/context/EVChargingContext";
import Dashboard from "./pages/Dashboard";
import GridAuthority from "./pages/GridAuthority";
import ChargingKiosk from "./pages/ChargingKiosk";
import BlockchainViewer from "./pages/BlockchainViewer";
import QuantumAttack from "./pages/QuantumAttack";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EVChargingProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/grid" element={<GridAuthority />} />
            <Route path="/kiosk" element={<ChargingKiosk />} />
            <Route path="/blockchain" element={<BlockchainViewer />} />
            <Route path="/quantum" element={<QuantumAttack />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EVChargingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
