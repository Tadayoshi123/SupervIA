import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)]">
      <a href="#main" className="skip-link">Aller au contenu principal</a>
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Supervision intelligente • Dashboards • Zabbix
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-tech-gradient">
          SupervIA
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Pilotez votre infrastructure avec des tableaux de bord modernes, une IA copilote et une intégration native Zabbix.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button className="bg-tech-gradient text-white hover:opacity-90">Accéder au dashboard</Button>
          </Link>
          <Link href="/dashboard-editor">
            <Button variant="outline">Créer un dashboard</Button>
          </Link>
        </div>
      </section>

      <section id="main" className="container mx-auto px-6 py-10 grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Surveillez en temps réel',
            desc: 'Vue unifiée des hôtes, problèmes et métriques via Zabbix.',
          },
          {
            title: 'Personnalisez vos widgets',
            desc: 'Glisser-déposer, statuts, graphiques, listes de problèmes.',
          },
          {
            title: 'Thème clair/sombre',
            desc: 'Un design moderne, accessible, avec bascule de thème.',
          },
        ].map((f, i) => (
          <article key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
