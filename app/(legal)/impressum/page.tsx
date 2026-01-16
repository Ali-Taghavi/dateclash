"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Impressum() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle theme hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768387131/dateclash/DateClash_Logo_eza9uv.png"
              alt="DateClash Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl" style={{ fontFamily: 'var(--font-inter)' }}>
              <span className="font-[700]">Date</span>
              <span className="font-[300]">Clash</span>
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const newTheme = resolvedTheme === "dark" ? "light" : "dark";
                setTheme(newTheme);
              }}
              className={cn(
                "p-2 rounded-md border border-foreground/20",
                "hover:bg-foreground/5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-foreground/20"
              )}
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">Impressum</h1>
        
        <div className="space-y-6 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 DDG:</h2>
            <p>
              MergeLabs GmbH<br />
              Schwetzingen<br />
              {/* [Please add your street address here later if not provided] */}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Vertreten durch:</h2>
            <p>
              {/* [Geschäftsführer Name - please insert placeholder] */}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Kontakt:</h2>
            <p>
              E-Mail: <a href="mailto:dataprivacy@mergelabs.io" className="text-[var(--teal-primary)] hover:underline">dataprivacy@mergelabs.io</a><br />
              {/* [Optional: Phone] */}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Registereintrag:</h2>
            <p>
              Eintragung im Handelsregister.<br />
              Registergericht: Mannheim<br />
              Registernummer: HRB 747275
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Umsatzsteuer-ID:</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              DE362131307
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</h2>
            <p>
              MergeLabs GmbH<br />
              Schwetzingen
            </p>
          </section>

          <section className="pt-6 border-t border-foreground/10">
            <h2 className="text-lg font-semibold mb-2">Haftungsausschluss (Disclaimer)</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">Haftung für Inhalte</h3>
                <p className="text-sm">
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">Haftung für Links</h3>
                <p className="text-sm">
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">Urheberrecht</h3>
                <p className="text-sm">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
