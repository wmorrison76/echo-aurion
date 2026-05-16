import React from "react";

export type Lang = "en" | "es" | "fr" | "pt" | "it";

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  en: {
    // Legacy
    "nav.home": "Home",
    "nav.blueprint": "Blueprint",
    "nav.studio": "Studio",
    "cta.openStudio": "Open Studio",
    "studio.title": "EchoCoder Studio",
    "studio.subtitle":
      "Plan → Code → Verify → Preview. Professional, compact layout.",

    // Golden Seed - Sidebar
    "sidebar.dashboard": "Dashboard",
    "sidebar.culinary": "Culinary",
    "sidebar.pastry": "Pastry",
    "sidebar.schedule": "Schedule",
    "sidebar.inventory": "Inventory",
    "sidebar.maestro": "Maestro",
    "sidebar.mixology": "Mixology",
    "sidebar.crm": "CRM",
    "sidebar.chefnet": "ChefNet",
    "sidebar.support": "Support",
    "sidebar.whiteboard": "Whiteboard",
    "sidebar.video": "Video",
    "sidebar.canvas": "Canvas",
    "sidebar.stickynotes": "Sticky Notes",
    "sidebar.echocoder": "EchoCoder",
    "sidebar.aurum": "Echo Aurum",
    "sidebar.layout": "Echo Layout",
    "sidebar.settings": "Settings",

    // Modules
    "module.culinary": "Culinary",
    "module.culinary.desc": "Recipe management, techniques, and ingredients",
    "module.pastry": "Pastry",
    "module.pastry.desc": "3D cake design system with layering",
    "module.schedule": "Schedule",
    "module.schedule.desc": "Production timeline & staff assignments",
    "module.inventory": "Inventory",
    "module.inventory.desc": "Food/supply purchasing & tracking",
    "module.crm": "CRM",
    "module.crm.desc": "Customer relationships & sales",
    "module.chefnet": "ChefNet",
    "module.chefnet.desc": "Team collaboration & messaging",
    "module.support": "Support",
    "module.support.desc": "Help desk & ticket management",
    "module.whiteboard": "Whiteboard",
    "module.whiteboard.desc": "Collaborative drawing canvas",
    "module.video": "Video Conference",
    "module.video.desc": "Video/audio calls and screen sharing",
    "module.canvas": "Canvas",
    "module.canvas.desc": "3D image generation & visualization",
    "module.stickynotes": "Sticky Notes",
    "module.stickynotes.desc": "Quick notes & reminders",
    "module.echocoder": "EchoCoder",
    "module.echocoder.desc": "Developer studio",
    "module.aurum": "Echo Aurum",
    "module.aurum.desc": "Premium analytics",
    "module.layout": "Echo Layout",
    "module.layout.desc": "Space & seating",

    // Dashboard
    "dashboard.title": "Golden Seed Suite",
    "dashboard.subtitle": "Hospitality Management",
    "dashboard.description":
      "15 integrated modules for professional hospitality operations",
    "dashboard.stats.modules": "Total Modules",
    "dashboard.stats.colors": "Color Schemes",
    "dashboard.stats.languages": "Languages",
    "dashboard.stats.panels": "Floating Panels",

    // Toolbar
    "toolbar.theme": "Theme",
    "toolbar.language": "Language",
  },
  es: {
    // Legacy
    "nav.home": "Inicio",
    "nav.blueprint": "Planos",
    "nav.studio": "Estudio",
    "cta.openStudio": "Abrir Estudio",
    "studio.title": "Estudio EchoCoder",
    "studio.subtitle":
      "Planificar → Codificar → Verificar → Previsualizar. Diseño profesional y compacto.",

    // Golden Seed - Sidebar
    "sidebar.dashboard": "Panel",
    "sidebar.culinary": "Culinaria",
    "sidebar.pastry": "Pastelería",
    "sidebar.schedule": "Horario",
    "sidebar.inventory": "Inventario",
    "sidebar.maestro": "Maestro",
    "sidebar.mixology": "Mixología",
    "sidebar.crm": "CRM",
    "sidebar.chefnet": "ChefNet",
    "sidebar.support": "Soporte",
    "sidebar.whiteboard": "Pizarra",
    "sidebar.video": "Video",
    "sidebar.canvas": "Lienzo",
    "sidebar.stickynotes": "Notas",
    "sidebar.echocoder": "EchoCoder",
    "sidebar.aurum": "Echo Aurum",
    "sidebar.layout": "Echo Layout",
    "sidebar.settings": "Configuración",

    // Modules
    "module.culinary": "Culinaria",
    "module.culinary.desc": "Gestión de recetas, técnicas e ingredientes",
    "module.pastry": "Pastelería",
    "module.pastry.desc": "Sistema de diseño de pasteles 3D con capas",
    "module.schedule": "Horario",
    "module.schedule.desc": "Cronograma de producción y asignación de personal",
    "module.inventory": "Inventario",
    "module.inventory.desc": "Compra y seguimiento de alimentos/suministros",
    "module.crm": "CRM",
    "module.crm.desc": "Relaciones con clientes y ventas",
    "module.chefnet": "ChefNet",
    "module.chefnet.desc": "Colaboración y mensajería en equipo",
    "module.support": "Soporte",
    "module.support.desc": "Gestión de escritorio de ayuda y tickets",
    "module.whiteboard": "Pizarra",
    "module.whiteboard.desc": "Lienzo de dibujo colaborativo",
    "module.video": "Videoconferencia",
    "module.video.desc": "Llamadas de video/audio y uso compartido de pantalla",
    "module.canvas": "Lienzo",
    "module.canvas.desc": "Generación y visualización de imágenes 3D",
    "module.stickynotes": "Notas Adhesivas",
    "module.stickynotes.desc": "Notas rápidas y recordatorios",
    "module.echocoder": "EchoCoder",
    "module.echocoder.desc": "Estudio de desarrollador",
    "module.aurum": "Echo Aurum",
    "module.aurum.desc": "Análisis premium",
    "module.layout": "Echo Layout",
    "module.layout.desc": "Gestión de espacio y asientos",

    // Dashboard
    "dashboard.title": "Suite Golden Seed",
    "dashboard.subtitle": "Gestión de Hospitalidad",
    "dashboard.description":
      "15 módulos integrados para operaciones hospitalarias profesionales",
    "dashboard.stats.modules": "Total de Módulos",
    "dashboard.stats.colors": "Esquemas de Color",
    "dashboard.stats.languages": "Idiomas",
    "dashboard.stats.panels": "Paneles Flotantes",

    // Toolbar
    "toolbar.theme": "Tema",
    "toolbar.language": "Idioma",
  },
  fr: {
    // Legacy
    "nav.home": "Accueil",
    "nav.blueprint": "Plan",
    "nav.studio": "Studio",
    "cta.openStudio": "Ouvrir le Studio",
    "studio.title": "Studio EchoCoder",
    "studio.subtitle":
      "Planifier → Coder → Vérifier → Prévisualiser. Mise en page professionnelle et compacte.",

    // Golden Seed - Sidebar
    "sidebar.dashboard": "Tableau de Bord",
    "sidebar.culinary": "Culinaire",
    "sidebar.pastry": "Pâtisserie",
    "sidebar.schedule": "Horaire",
    "sidebar.inventory": "Inventaire",
    "sidebar.maestro": "Maestro",
    "sidebar.mixology": "Mixologie",
    "sidebar.crm": "CRM",
    "sidebar.chefnet": "ChefNet",
    "sidebar.support": "Support",
    "sidebar.whiteboard": "Tableau Blanc",
    "sidebar.video": "Vidéo",
    "sidebar.canvas": "Toile",
    "sidebar.stickynotes": "Notes",
    "sidebar.echocoder": "EchoCoder",
    "sidebar.aurum": "Echo Aurum",
    "sidebar.layout": "Echo Layout",
    "sidebar.settings": "Paramètres",

    // Modules - abbreviated for space
    "module.culinary": "Culinaire",
    "module.culinary.desc": "Gestion des recettes, techniques et ingrédients",
    "module.pastry": "Pâtisserie",
    "module.pastry.desc": "Système de conception de gâteaux 3D avec couches",
    "module.schedule": "Horaire",
    "module.schedule.desc":
      "Chronologie de production et affectation du personnel",
    "module.inventory": "Inventaire",
    "module.inventory.desc": "Achat et suivi des aliments/fournitures",
    "module.crm": "CRM",
    "module.crm.desc": "Relations client et ventes",
    "module.chefnet": "ChefNet",
    "module.chefnet.desc": "Collaboration et messagerie d'équipe",
    "module.support": "Support",
    "module.support.desc": "Gestion du service d'assistance et des tickets",
    "module.whiteboard": "Tableau Blanc",
    "module.whiteboard.desc": "Canevas de dessin collaboratif",
    "module.video": "Vidéoconférence",
    "module.video.desc": "Appels vidéo/audio et partage d'écran",
    "module.canvas": "Toile",
    "module.canvas.desc": "Génération et visualisation d'images 3D",
    "module.stickynotes": "Notes Autocollantes",
    "module.stickynotes.desc": "Notes rapides et rappels",
    "module.echocoder": "EchoCoder",
    "module.echocoder.desc": "Studio pour développeurs",
    "module.aurum": "Echo Aurum",
    "module.aurum.desc": "Analyses premium",
    "module.layout": "Echo Layout",
    "module.layout.desc": "Gestion des espaces et sièges",

    // Dashboard
    "dashboard.title": "Suite Golden Seed",
    "dashboard.subtitle": "Gestion Hôtelière",
    "dashboard.description":
      "15 modules intégrés pour les opérations hôtelières professionnelles",
    "dashboard.stats.modules": "Total des Modules",
    "dashboard.stats.colors": "Schémas de Couleurs",
    "dashboard.stats.languages": "Langues",
    "dashboard.stats.panels": "Panneaux Flottants",

    // Toolbar
    "toolbar.theme": "Thème",
    "toolbar.language": "Langue",
  },
  pt: {
    // Legacy
    "nav.home": "Início",
    "nav.blueprint": "Blueprint",
    "nav.studio": "Estúdio",
    "cta.openStudio": "Abrir Estúdio",
    "studio.title": "Estúdio EchoCoder",
    "studio.subtitle":
      "Planejar → Codar → Verificar → Pré-visualizar. Layout profissional e compacto.",

    // Golden Seed - Sidebar
    "sidebar.dashboard": "Painel",
    "sidebar.culinary": "Culinária",
    "sidebar.pastry": "Pastelaria",
    "sidebar.schedule": "Cronograma",
    "sidebar.inventory": "Inventário",
    "sidebar.maestro": "Maestro",
    "sidebar.mixology": "Mixologia",
    "sidebar.crm": "CRM",
    "sidebar.chefnet": "ChefNet",
    "sidebar.support": "Suporte",
    "sidebar.whiteboard": "Quadro Branco",
    "sidebar.video": "Vídeo",
    "sidebar.canvas": "Tela",
    "sidebar.stickynotes": "Notas",
    "sidebar.echocoder": "EchoCoder",
    "sidebar.aurum": "Echo Aurum",
    "sidebar.layout": "Echo Layout",
    "sidebar.settings": "Configurações",

    // Modules
    "module.culinary": "Culinária",
    "module.culinary.desc":
      "Gerenciamento de receitas, técnicas e ingredientes",
    "module.pastry": "Pastelaria",
    "module.pastry.desc": "Sistema de design de bolos 3D com camadas",
    "module.schedule": "Cronograma",
    "module.schedule.desc":
      "Cronograma de produção e atribuição de funcionários",
    "module.inventory": "Inventário",
    "module.inventory.desc": "Compra e rastreamento de alimentos/suprimentos",
    "module.crm": "CRM",
    "module.crm.desc": "Relacionamento com clientes e vendas",
    "module.chefnet": "ChefNet",
    "module.chefnet.desc": "Colaboração e mensagens em equipe",
    "module.support": "Suporte",
    "module.support.desc": "Gerenciamento de suporte e tickets",
    "module.whiteboard": "Quadro Branco",
    "module.whiteboard.desc": "Tela de desenho colaborativo",
    "module.video": "Videoconferência",
    "module.video.desc": "Chamadas de vídeo/áudio e compartilhamento de tela",
    "module.canvas": "Tela",
    "module.canvas.desc": "Geração e visualização de imagens 3D",
    "module.stickynotes": "Notas Adesivas",
    "module.stickynotes.desc": "Notas rápidas e lembretes",
    "module.echocoder": "EchoCoder",
    "module.echocoder.desc": "Estúdio do desenvolvedor",
    "module.aurum": "Echo Aurum",
    "module.aurum.desc": "Análises premium",
    "module.layout": "Echo Layout",
    "module.layout.desc": "Gerenciamento de espaço e assentos",

    // Dashboard
    "dashboard.title": "Suíte Golden Seed",
    "dashboard.subtitle": "Gestão de Hospitalidade",
    "dashboard.description":
      "15 módulos integrados para operações de hospitalidade profissional",
    "dashboard.stats.modules": "Total de Módulos",
    "dashboard.stats.colors": "Esquemas de Cores",
    "dashboard.stats.languages": "Idiomas",
    "dashboard.stats.panels": "Painéis Flutuantes",

    // Toolbar
    "toolbar.theme": "Tema",
    "toolbar.language": "Idioma",
  },
  it: {
    // Legacy
    "nav.home": "Home",
    "nav.blueprint": "Blueprint",
    "nav.studio": "Studio",
    "cta.openStudio": "Apri Studio",
    "studio.title": "Studio EchoCoder",
    "studio.subtitle":
      "Pianifica → Codifica → Verifica → Anteprima. Layout professionale e compatto.",

    // Golden Seed - Sidebar
    "sidebar.dashboard": "Pannello",
    "sidebar.culinary": "Culinaria",
    "sidebar.pastry": "Pasticceria",
    "sidebar.schedule": "Orario",
    "sidebar.inventory": "Inventario",
    "sidebar.maestro": "Maestro",
    "sidebar.mixology": "Mixologia",
    "sidebar.crm": "CRM",
    "sidebar.chefnet": "ChefNet",
    "sidebar.support": "Supporto",
    "sidebar.whiteboard": "Lavagna",
    "sidebar.video": "Video",
    "sidebar.canvas": "Tela",
    "sidebar.stickynotes": "Note",
    "sidebar.echocoder": "EchoCoder",
    "sidebar.aurum": "Echo Aurum",
    "sidebar.layout": "Echo Layout",
    "sidebar.settings": "Impostazioni",

    // Modules
    "module.culinary": "Culinaria",
    "module.culinary.desc": "Gestione ricette, tecniche e ingredienti",
    "module.pastry": "Pasticceria",
    "module.pastry.desc": "Sistema di progettazione di torte 3D con strati",
    "module.schedule": "Orario",
    "module.schedule.desc":
      "Timeline di produzione e assegnazione del personale",
    "module.inventory": "Inventario",
    "module.inventory.desc": "Acquisto e tracciamento di alimenti/forniture",
    "module.crm": "CRM",
    "module.crm.desc": "Relazioni con i clienti e vendite",
    "module.chefnet": "ChefNet",
    "module.chefnet.desc": "Collaborazione e messaggistica del team",
    "module.support": "Supporto",
    "module.support.desc": "Gestione helpdesk e ticket",
    "module.whiteboard": "Lavagna",
    "module.whiteboard.desc": "Tela di disegno collaborativa",
    "module.video": "Videoconferenza",
    "module.video.desc": "Chiamate video/audio e condivisione dello schermo",
    "module.canvas": "Tela",
    "module.canvas.desc": "Generazione e visualizzazione di immagini 3D",
    "module.stickynotes": "Note Adesive",
    "module.stickynotes.desc": "Note rapide e promemoria",
    "module.echocoder": "EchoCoder",
    "module.echocoder.desc": "Studio dello sviluppatore",
    "module.aurum": "Echo Aurum",
    "module.aurum.desc": "Analisi premium",
    "module.layout": "Echo Layout",
    "module.layout.desc": "Gestione dello spazio e dei posti",

    // Dashboard
    "dashboard.title": "Suite Golden Seed",
    "dashboard.subtitle": "Gestione dell'Ospitalità",
    "dashboard.description":
      "15 moduli integrati per operazioni di ospitalità professionale",
    "dashboard.stats.modules": "Moduli Totali",
    "dashboard.stats.colors": "Schemi di Colore",
    "dashboard.stats.languages": "Lingue",
    "dashboard.stats.panels": "Pannelli Flottanti",

    // Toolbar
    "toolbar.theme": "Tema",
    "toolbar.language": "Lingua",
  },
};

const I18nCtx = React.createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>(
    () => (localStorage.getItem("lang") as Lang) || "en",
  );
  React.useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);
  // React to external language changes (storage or custom event)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lang" && typeof e.newValue === "string") {
        const val = (e.newValue as Lang) || "en";
        if (val !== lang) setLang(val);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as Lang | undefined;
      if (detail && detail !== lang) setLang(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("i18n:lang", onCustom as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("i18n:lang", onCustom as any);
    };
  }, [lang]);
  const dict = React.useMemo(
    () => dictionaries[lang] || dictionaries.en,
    [lang],
  );
  const t = (k: string) => dict[k] ?? dictionaries.en[k] ?? k;
  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>
  );
}

export function useI18n() {
  const ctx = React.useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
