import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Dashboard from "@/components/Dashboard";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="noise-overlay" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="system" position="bottom-right" />
    </div>
  );
}

export default App;
