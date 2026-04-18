import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Shield, PieChart, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 opacity-30">
         <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="" className="w-full h-full object-cover mix-blend-screen mask-image-gradient" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
      </div>

      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-12 py-4 sm:py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs sm:text-sm">L</span>
          </div>
          LifeLedger
        </div>
        <div className="flex items-center gap-2 sm:gap-4 font-medium text-sm">
          <Link href="/login" className="hover:text-primary transition-colors whitespace-nowrap">Log in</Link>
          <Link href="/register" className="bg-foreground text-background hover:bg-foreground/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors whitespace-nowrap text-xs sm:text-sm">Sign up</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center z-10 mt-8 sm:mt-16 md:mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl w-full"
        >
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-4 sm:mb-6">
            Take <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Control</span> of Your<br />Financial Life
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto font-light">
            The premium, private-first expense tracker. All your data lives securely in your browser. Beautiful, fast, and entirely yours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-bold hover:shadow-[0_0_40px_-10px_var(--color-primary)] hover:-translate-y-1 transition-all duration-300">
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <div className="mt-16 sm:mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 max-w-5xl mx-auto w-full mb-12 sm:mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card/40 backdrop-blur-xl border border-border p-5 sm:p-8 rounded-3xl text-left">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">100% Private</h3>
            <p className="text-muted-foreground text-sm sm:text-base">No servers, no cloud. Your financial data is encrypted and stored locally on your device.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card/40 backdrop-blur-xl border border-border p-5 sm:p-8 rounded-3xl text-left">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-4 sm:mb-6">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Smart Budgets</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Set category limits and get visual insights on your spending habits instantly.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card/40 backdrop-blur-xl border border-border p-5 sm:p-8 rounded-3xl text-left">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-4 sm:mb-6">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Because it runs locally, adding transactions and viewing charts happens in milliseconds.</p>
          </motion.div>
        </div>
      </main>

    </div>
  );
}
