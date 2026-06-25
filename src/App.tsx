import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "./app/Dashboard";
import { Layout } from "./components/Layout";
import { ViewType, Customer } from "./types";
import { CustomersView } from "./app/CustomersView";
import { AIView } from "./app/AIView";
import { InventoryView } from "./app/InventoryView";
import { AuditLogView } from "./app/AuditLogView";
import { SalesAnalyticsView } from "./app/SalesAnalyticsView";
import { SettingsView } from "./app/SettingsView";
import { CustomerStatementModal } from "./components/CustomerStatementModal";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  const renderView = () => {
    const activeView = (() => {
      switch (currentView) {
        case 'dashboard': 
          return (
            <Dashboard onNavigate={setCurrentView} onOpenStatement={setStatementCustomer} />
          );
        case 'customers': return <CustomersView onOpenStatement={setStatementCustomer} />;
        case 'inventory': return <InventoryView />;
        case 'audit-log': return <AuditLogView />;
        case 'sales-analytics': return <SalesAnalyticsView />;
        case 'ai': return <AIView />;
        case 'settings': return <SettingsView />;
        default: 
          return (
            <Dashboard onOpenStatement={setStatementCustomer} />
          );
      }
    })();

    return (
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.98 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.23, 1, 0.32, 1], // Custom cubic-bezier for high-end feel
        }}
        style={{ willChange: "transform" }} // Hint for GPU optimization
        className="gpu-accelerated"
      >
        {activeView}
      </motion.div>
    );
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      <AnimatePresence mode="wait" initial={false}>
        {renderView()}
      </AnimatePresence>
      <CustomerStatementModal
        isOpen={!!statementCustomer}
        onClose={() => setStatementCustomer(null)}
        customer={statementCustomer}
      />
    </Layout>
  );
}
