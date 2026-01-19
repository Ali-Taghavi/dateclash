"use client";

import React from "react";

export function LegalSection() {
  return (
    <div className="mt-12 pt-8 border-t border-foreground/10 bg-foreground/[0.02] rounded-2xl p-8">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
          Legal Notice & Disclaimer
        </h3>
        <p className="text-xs leading-relaxed text-foreground/60 italic">
          DateClash is a service provided by MergeLabs GmbH. All data, including school holidays, 
          public holidays, weather forecasts, and event listings, is provided "as is" for 
          informational purposes only. MergeLabs GmbH makes no representations or warranties 
          of any kind, express or implied, regarding the accuracy, reliability, or completeness 
          of the data. Dates are subject to change by local authorities without notice.
        </p>
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
          <a 
            href="/impressum" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-[var(--teal-primary)] transition-colors"
          >
            Impressum
          </a>
          <span>•</span>
          <a 
            href="/datenschutz" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-[var(--teal-primary)] transition-colors"
          >
            Datenschutzerklärung
          </a>
        </div>
      </div>
    </div>
  );
}