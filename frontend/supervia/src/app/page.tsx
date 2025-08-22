'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import { 
  Activity, 
  BarChart3, 
  Brain, 
  CheckCircle, 
  Eye, 
  Gauge, 
  Globe, 
  LineChart, 
  Monitor, 
  Palette, 
  Zap,
  ArrowRight,
  Star,
  Users,
  Shield
} from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>
        <div className="container mx-auto px-6 py-24 md:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 border px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm mb-8">
              <Zap className="h-4 w-4 text-cyan-500" />
              Supervision intelligente • Dashboards • Multi-plateformes
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              <span className="text-tech-gradient">SupervIA</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Transformez votre infrastructure monitoring avec l'intelligence artificielle, 
              des tableaux de bord intuitifs et une <strong>compatibilité étendue</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <AuthenticatedActions />
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Sécurisé & privé
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Gestion d'équipe
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Open source
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir <span className="text-tech-gradient">SupervIA</span> ?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Une plateforme complète qui révolutionne la supervision d'infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-8">
                  <div className="mb-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-cyan-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Superviser n'a jamais été aussi <span className="text-tech-gradient">simple</span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  SupervIA combine la puissance de Zabbix avec l'intelligence artificielle 
                  pour vous offrir une expérience de monitoring révolutionnaire.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">{benefit.title}</h4>
                        <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-8 border">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Monitor className="h-6 w-6 text-cyan-600" />
                      <span className="font-semibold">Dashboard en temps réel</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="text-sm">Serveurs en ligne</span>
                        <span className="font-bold text-green-600">12/12</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <span className="text-sm">Alertes actives</span>
                        <span className="font-bold text-yellow-600">3</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span className="text-sm">CPU moyen</span>
                        <span className="font-bold text-blue-600">23%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-cyan-600 to-blue-600">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Prêt à révolutionner votre monitoring ?
            </h2>
            <p className="text-xl text-cyan-100 mb-8">
              Rejoignez les équipes qui font confiance à SupervIA pour leurs infrastructures critiques
            </p>
            <AuthenticatedActions variant="cta" />
          </div>
        </div>
      </section>
    </div>
  );
}

// Composant pour gérer les actions selon l'état d'authentification
function AuthenticatedActions({ variant = 'hero' }: { variant?: 'hero' | 'cta' }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  const baseClasses = variant === 'cta' 
    ? "text-white border-white/20 hover:bg-white/10" 
    : "";
    
  const primaryClasses = variant === 'cta'
    ? "bg-white text-cyan-600 hover:bg-gray-100"
    : "bg-tech-gradient text-white hover:opacity-90";

  if (isAuthenticated) {
    return (
      <>
        <Link href="/dashboard">
          <Button size="lg" className={`${primaryClasses} px-8 py-3 text-lg font-semibold`}>
            <Monitor className="mr-2 h-5 w-5" />
            Accéder au tableau de bord
          </Button>
        </Link>
        <Link href="/dashboard-editor">
          <Button 
            variant={variant === 'cta' ? 'outline' : 'outline'} 
            size="lg" 
            className={`px-8 py-3 text-lg ${baseClasses}`}
          >
            <Palette className="mr-2 h-5 w-5" />
            Créer un dashboard
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/register">
        <Button size="lg" className={`${primaryClasses} px-8 py-3 text-lg font-semibold`}>
          Commencer gratuitement
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
      <Link href="/login">
        <Button 
          variant={variant === 'cta' ? 'outline' : 'outline'} 
          size="lg" 
          className={`px-8 py-3 text-lg ${baseClasses}`}
        >
          Se connecter
        </Button>
      </Link>
    </>
  );
}

const features = [
  {
    icon: Eye,
    title: 'Surveillance temps réel',
    description: 'Supervision continue de vos serveurs, services et applications avec des alertes intelligentes'
  },
  {
    icon: Palette,
    title: 'Dashboards personnalisables',
    description: 'Interface drag & drop pour créer des tableaux de bord sur mesure adaptés à vos besoins'
  },
  {
    icon: Brain,
    title: 'IA intégrée',
    description: 'Détection d\'anomalies automatique, prévisions et suggestions intelligentes pour optimiser vos performances'
  },
  {
    icon: LineChart,
    title: 'Graphiques avancés',
    description: 'Visualisations interactives avec graphiques en temps réel, jauges et métriques multi-sources'
  },
  {
    icon: Globe,
    title: 'Compatibilité multi-solutions',
    description: 'Connectivité avec Zabbix et d\'autres solutions de monitoring via API'
  },
  {
    icon: Gauge,
    title: 'Alertes intelligentes',
    description: 'Système de notifications configurable avec seuils adaptatifs et escalade automatique'
  }
];

const benefits = [
  {
    title: 'Déployement en 2 minutes',
    description: 'Configuration rapide avec Docker et intégration automatique à vos outils de monitoring existants'
  },
  {
    title: 'Interface intuitive',
    description: 'Design moderne et ergonomique conçu pour les équipes techniques et management'
  },
  {
    title: 'Évolutif et performant',
    description: 'Architecture microservices capable de gérer des milliers d\'hôtes de toutes plateformes simultanément'
  },
  {
    title: 'Sécurité renforcée',
    description: 'Authentification JWT, chiffrement des données et respect des standards de sécurité'
  }
];