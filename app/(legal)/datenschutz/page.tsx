export default function Datenschutz() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>
        
        <div className="space-y-6 text-foreground/80 leading-relaxed">
          <p className="text-base">
            Wir freuen uns über Ihr Interesse an unserer Website. Der Schutz Ihrer Privatsphäre ist für uns sehr wichtig. Nachstehend informieren wir Sie ausführlich über den Umgang mit Ihren Daten.
          </p>

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Zugriffsdaten und Hosting</h2>
            <p className="text-sm">
              Diese Website wird über Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA gehostet. Beim Aufruf unserer Website werden automatisch Informationen in sogenannte Server-Logfiles übermittelt und gespeichert. Diese umfassen unter anderem Ihre IP-Adresse, Datum und Uhrzeit des Zugriffs, übertragene Datenmengen sowie Informationen zu Ihrem Browser und Betriebssystem. Diese Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO zur Gewährleistung der Sicherheit und Stabilität der Website sowie zur Abwehr von Angriffen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Datenerfassung (Supabase)</h2>
            <p className="text-sm">
              Wir nutzen Supabase (Supabase, Inc., 970 Toa Payoh North #07-04, Singapore 318992) für Datenbankservices. Dabei werden technische Daten wie Abfragezeiten und Fehlerprotokolle verarbeitet, um den ordnungsgemäßen Betrieb unseres Dienstes sicherzustellen. Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Funktionsfähigkeit des Dienstes).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Externe Dienste (APIs)</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-base font-medium mb-2">OpenHolidays API</h3>
                <p>
                  Für die Anzeige von öffentlichen Feiertagen nutzen wir die OpenHolidays API (https://openholidaysapi.org/). Bei Abfragen dieser API können technische Daten, einschließlich Ihrer IP-Adresse, an den API-Anbieter übermittelt werden. Diese Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Funktionalität des Dienstes).
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">Open-Meteo API</h3>
                <p>
                  Für die Anzeige von Wetterdaten nutzen wir die Open-Meteo API (https://open-meteo.com/). Bei Abfragen dieser API werden technische Daten, einschließlich Ihrer IP-Adresse, zur technischen Abwicklung der Anfrage übermittelt. Diese Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Funktionalität des Dienstes).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Cookies</h2>
            <p className="text-sm">
              Wir verwenden auf dieser Website keine Tracking-Cookies oder Analyse-Tools (wie Google Analytics). Soweit technisch notwendige Cookies für die Funktionalität der Website verwendet werden, dienen diese ausschließlich der Bereitstellung des Dienstes und werden nicht zu Analyse- oder Marketingzwecken genutzt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Betroffenenrechte</h2>
            <p className="text-sm mb-2">
              Sie haben nach Maßgabe der geltenden Datenschutzgesetze folgende Rechte:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>
                <strong>Auskunft (Art. 15 DSGVO):</strong> Sie haben das Recht, Auskunft über die von uns verarbeiteten personenbezogenen Daten zu erhalten.
              </li>
              <li>
                <strong>Berichtigung (Art. 16 DSGVO):</strong> Sie haben das Recht, die Berichtigung unrichtiger oder die Vervollständigung unvollständiger Daten zu verlangen.
              </li>
              <li>
                <strong>Löschung (Art. 17 DSGVO):</strong> Sie haben das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen.
              </li>
              <li>
                <strong>Einschränkung (Art. 18 DSGVO):</strong> Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.
              </li>
              <li>
                <strong>Widerspruch (Art. 21 DSGVO):</strong> Sie haben das Recht, der Verarbeitung Ihrer personenbezogenen Daten zu widersprechen, soweit diese auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO erfolgt.
              </li>
            </ul>
            <p className="text-sm mt-4">
              Zur Ausübung Ihrer Rechte können Sie sich jederzeit an uns wenden: <a href="mailto:taghavi@mergelabs.io" className="text-[var(--teal-primary)] hover:underline">taghavi@mergelabs.io</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
