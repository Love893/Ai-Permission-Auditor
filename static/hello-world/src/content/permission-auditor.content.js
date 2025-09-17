const en = {
  heroTitle: "Welcome to Permission Auditor",
  heroSubtitle: "Audit Jira permissions, spot risks, and ensure least-privilege access.",
  specRows: [
    {
      id: "solves", label: "What it solves:", links: [
        "Permission sprawl, risky admin access, unclear project roles, audit fatigue, and compliance gaps."
      ]
    },
    {
      id: "who", label: "Who it’s for:", links: [
        "Admins, Security/Compliance, Project Leads, IT Governance, and Enterprise PMOs."
      ]
    },
    {
      id: "inside", label: "What’s inside each app:", links: [
        "Problem, Personas, Features, AI value, Metrics, Dev notes, Dependencies, GTM."
      ]
    },
    {
      id: "ai", label: "AI in action:", links: [
        "Highlight risky permissions, suggest safer roles, detect unused admins, and recommend cleanup."
      ]
    },
    {
      id: "build", label: "Build & integrate faster:", links: [
        "Jira API maps, audit workflows, backend/reporting patterns, UI dashboards, caching tips."
      ]
    },
    {
      id: "measure", label: "Measure impact:", links: [
        "Track reduced admin count, improved least-privilege scores, compliance readiness, audit coverage."
      ]
    },
  ],
  ctas: {
    run: "Run Permission Audit Assistant",
    rescan: "Rescan",
    analyse: "Analyse",
    moreApps: "More from us",
    contactUs: "Get in touch",
  },
  moreApps: {
    title: "More Apps from Us",
    subtitle: "Discover our suite of powerful Atlassian apps",
    drawerTitle: "More Apps from Us",
    featuredTitle: "Featured Apps",
    footer: "All apps are built with ❤️ by our team"
  },
  assistant: {
    title: "Welcome to Permission Audit Assistant",
    subtitle: "Questions on access, roles, or risks?",
    quickActions: [
      { id: "admins", label: "Find users with Admin access", icon: "search" },
      { id: "roles", label: "Audit project roles", icon: "users" },
      { id: "inactive", label: "Spot unused permissions", icon: "sliders" },
      { id: "leastPriv", label: "Enforce least privilege", icon: "piggy-bank" },
    ],
    inputPlaceholder: "Enter your Query",
  },
  chat: {
    suggestionsTitle: "Suggested Follow-up questions:",
    followUps: [
      "Which projects have the highest number of admins?",
      "Do we have inactive users still holding roles?",
      "Which groups pose the highest risk exposure?",
      "What are the compliance gaps for audits?"
    ],
    networkErrorTitle: "Network error: Unable to connect to the server.",
    networkErrorHint: "Please check if the backend is running",
    needMoreHelp: "Need more help?",
    contactUs: "Contact Us",
    waitingMessages: [
      "🔄 Scanning all permission schemes...",
      "🛡️ Auditing user roles and access rights...",
      "🔍 Checking for hidden admin privileges...",
      "📊 Mapping users, groups, and roles...",
      "🚦 Detecting risky permission overlaps...",
      "🧩 Piecing together project access levels...",
      "⚙️ Reviewing global vs. project permissions...",
      "📡 Tracing user access across groups...",
      "🔐 Identifying overexposed permissions...",
      "🕵️ Searching for unauthorized access risks...",
      "📑 Analyzing permission scheme details...",
      "🗂️ Cross-checking users against groups...",
      "🏗️ Validating permission scheme structures...",
      "🧭 Guiding towards least-privilege access...",
      "⚡ Highlighting critical security gaps...",
      "🛠️ Checking consistency across projects...",
      "📌 Pinpointing who has powerful roles...",
      "🛰️ Tracking inherited permissions...",
      "🔮 Predicting potential compliance risks...",
      "🚀 Strengthening security for safer projects..."
    ]
  },
  labels: {
    lastScanned: "Last scanned :",
    scanningProgress: "Scanning {current} Project out of {total} Projects."
  },
  defaultRetry: {
    retryMessage: "Hmm, I couldn’t process that fully. Could you retry your query?"
  }
};



const fr = {
  heroTitle: "Bienvenue dans l’Auditeur de Permissions",
  heroSubtitle: "Auditez les permissions Jira, identifiez les risques et appliquez le principe du moindre privilège.",
  specRows: [
    {
      id: "solves", label: "Ce que cela résout :", links: [
        "Prolifération des permissions, accès admin risqués, rôles de projet flous, fatigue d’audit et lacunes de conformité."
      ]
    },
    {
      id: "who", label: "Pour qui :", links: [
        "Admins, Sécurité/Conformité, Chefs de projet, Gouvernance IT et PMO d’entreprise."
      ]
    },
    {
      id: "inside", label: "Ce que contient chaque application :", links: [
        "Problème, Personae, Fonctionnalités, Valeur IA, Métriques, Notes dev, Dépendances, GTM."
      ]
    },
    {
      id: "ai", label: "IA en action :", links: [
        "Mise en évidence des permissions risquées, suggestion de rôles plus sûrs, détection des admins inutilisés et recommandations de nettoyage."
      ]
    },
    {
      id: "build", label: "Concevez et intégrez plus vite :", links: [
        "Cartes d’API Jira, workflows d’audit, patterns backend/rapports, tableaux de bord UI, astuces de mise en cache."
      ]
    },
    {
      id: "measure", label: "Mesurez l’impact :", links: [
        "Réduction du nombre d’admins, amélioration des scores de moindre privilège, préparation aux audits, couverture de conformité."
      ]
    },
  ],
  ctas: {
    run: "Lancer l’assistant d’audit des permissions",
    rescan: "Relancer l’audit",
    analyse: "Analyser",
    moreApps: "Plus de notre part",
    contactUs: "Nous contacter",
  },
  moreApps: {
    title: "Plus d’Apps de Notre Part",
    subtitle: "Découvrez notre suite d’apps Atlassian puissantes",
    drawerTitle: "Plus d’Apps de Notre Part",
    featuredTitle: "Apps en Vedette",
    footer: "Toutes les apps sont construites avec ❤️ par notre équipe"
  },
  assistant: {
    title: "Bienvenue dans l’Assistant d’Audit des Permissions",
    subtitle: "Des questions sur les accès, rôles ou risques ?",
    quickActions: [
      { id: "admins", label: "Trouver les utilisateurs avec accès Admin", icon: "search" },
      { id: "roles", label: "Auditer les rôles de projet", icon: "users" },
      { id: "inactive", label: "Repérer les permissions inutilisées", icon: "sliders" },
      { id: "leastPriv", label: "Appliquer le moindre privilège", icon: "piggy-bank" },
    ],
    inputPlaceholder: "Saisissez votre requête",
  },
  chat: {
    suggestionsTitle: "Suggestions de questions de suivi :",
    followUps: [
      "Quels projets ont le plus grand nombre d’admins ?",
      "Avons-nous des utilisateurs inactifs qui conservent des rôles ?",
      "Quels groupes présentent la plus forte exposition au risque ?",
      "Quelles sont les lacunes de conformité pour les audits ?"
    ],
    networkErrorTitle: "Erreur réseau : impossible de se connecter au serveur.",
    networkErrorHint: "Veuillez vérifier que le backend est démarré",
    needMoreHelp: "Besoin d’aide ?",
    contactUs: "Nous contacter",
    waitingMessages: [
      "🔄 Analyse de tous les schémas de permissions...",
      "🛡️ Audit des rôles et droits d’accès des utilisateurs...",
      "🔍 Vérification des privilèges admin cachés...",
      "📊 Cartographie des utilisateurs, groupes et rôles...",
      "🚦 Détection des chevauchements de permissions risqués...",
      "🧩 Reconstitution des niveaux d’accès projet...",
      "⚙️ Revue des permissions globales vs projet...",
      "📡 Traçage des accès utilisateurs à travers les groupes...",
      "🔐 Identification des permissions surexposées...",
      "🕵️ Recherche des risques d’accès non autorisé...",
      "📑 Analyse des détails des schémas de permissions...",
      "🗂️ Recoupement des utilisateurs avec les groupes...",
      "🏗️ Validation des structures de schémas de permissions...",
      "🧭 Orientation vers le moindre privilège...",
      "⚡ Mise en évidence des failles de sécurité critiques...",
      "🛠️ Vérification de la cohérence entre projets...",
      "📌 Identification des utilisateurs ayant des rôles puissants...",
      "🛰️ Suivi des permissions héritées...",
      "🔮 Prédiction des risques potentiels de conformité...",
      "🚀 Renforcement de la sécurité pour des projets plus sûrs..."
    ]
  },
  labels: {
    lastScanned: "Dernier audit :",
    scanningProgress: "Analyse du projet {current} sur {total} projets."
  },
  defaultRetry: {
    retryMessage: "Hum, je n’ai pas pu tout traiter. Pouvez-vous relancer votre requête ?"
  }
};



const es = {
  heroTitle: "Bienvenido al Auditor de Permisos",
  heroSubtitle: "Audita los permisos de Jira, detecta riesgos y garantiza el principio de mínimo privilegio.",
  specRows: [
    {
      id: "solves", label: "Qué resuelve:", links: [
        "Proliferación de permisos, accesos de administrador riesgosos, roles de proyecto poco claros, fatiga de auditoría y brechas de cumplimiento."
      ]
    },
    {
      id: "who", label: "Para quién:", links: [
        "Admins, Seguridad/Compliance, Líderes de Proyecto, Gobernanza IT y PMO empresarial."
      ]
    },
    {
      id: "inside", label: "Qué incluye cada app:", links: [
        "Problema, Perfiles, Funciones, Valor de IA, Métricas, Notas de dev, Dependencias, GTM."
      ]
    },
    {
      id: "ai", label: "IA en acción:", links: [
        "Resaltar permisos riesgosos, sugerir roles más seguros, detectar administradores sin uso y recomendar limpieza."
      ]
    },
    {
      id: "build", label: "Crea e integra más rápido:", links: [
        "Mapas de API de Jira, flujos de auditoría, patrones backend/reportes, paneles UI, consejos de caché."
      ]
    },
    {
      id: "measure", label: "Mide el impacto:", links: [
        "Reducción de administradores, mejora en los puntajes de mínimo privilegio, preparación para auditorías y cobertura de cumplimiento."
      ]
    },
  ],
  ctas: {
    run: "Ejecutar Asistente de Auditoría de Permisos",
    rescan: "Volver a auditar",
    analyse: "Analizar",
    moreApps: "Más nuestras",
    contactUs: "Ponte en contacto",
  },
  moreApps: {
    title: "Más Apps Nuestras",
    subtitle: "Descubre nuestra suite de apps Atlassian potentes",
    drawerTitle: "Más Apps Nuestras",
    featuredTitle: "Apps Destacadas",
    footer: "Todas las apps están construidas con ❤️ por nuestro equipo"
  },
  assistant: {
    title: "Bienvenido al Asistente de Auditoría de Permisos",
    subtitle: "¿Dudas sobre accesos, roles o riesgos?",
    quickActions: [
      { id: "admins", label: "Encontrar usuarios con acceso Admin", icon: "search" },
      { id: "roles", label: "Auditar roles de proyecto", icon: "users" },
      { id: "inactive", label: "Detectar permisos sin uso", icon: "sliders" },
      { id: "leastPriv", label: "Aplicar mínimo privilegio", icon: "piggy-bank" },

    ],
    inputPlaceholder: "Escribe tu consulta",
  },
  chat: {
    suggestionsTitle: "Preguntas de seguimiento sugeridas:",
    followUps: [
      "¿Qué proyectos tienen mayor cantidad de administradores?",
      "¿Hay usuarios inactivos que aún mantienen roles?",
      "¿Qué grupos representan la mayor exposición al riesgo?",
      "¿Cuáles son las brechas de cumplimiento para auditorías?"
    ],
    networkErrorTitle: "Error de red: no se puede conectar con el servidor.",
    networkErrorHint: "Verifica que el backend esté en ejecución",
    needMoreHelp: "¿Necesitas más ayuda?",
    contactUs: "Ponte en contacto",
    waitingMessages: [
      "🔄 Escaneando todos los esquemas de permisos...",
      "🛡️ Auditando roles de usuario y derechos de acceso...",
      "🔍 Verificando privilegios de administrador ocultos...",
      "📊 Mapeando usuarios, grupos y roles...",
      "🚦 Detectando solapamientos de permisos riesgosos...",
      "🧩 Armando los niveles de acceso de proyectos...",
      "⚙️ Revisando permisos globales vs. de proyecto...",
      "📡 Rastreando accesos de usuarios a través de grupos...",
      "🔐 Identificando permisos sobreexpuestos...",
      "🕵️ Buscando riesgos de acceso no autorizado...",
      "📑 Analizando detalles de esquemas de permisos...",
      "🗂️ Cruzando usuarios contra grupos...",
      "🏗️ Validando estructuras de esquemas de permisos...",
      "🧭 Guiando hacia el acceso de mínimo privilegio...",
      "⚡ Destacando brechas críticas de seguridad...",
      "🛠️ Verificando consistencia entre proyectos...",
      "📌 Señalando quién tiene roles poderosos...",
      "🛰️ Rastreando permisos heredados...",
      "🔮 Prediciendo riesgos potenciales de cumplimiento...",
      "🚀 Fortaleciendo la seguridad para proyectos más seguros..."
    ]
  },
  labels: {
    lastScanned: "Última auditoría :",
    scanningProgress: "Escaneando el proyecto {current} de un total de {total} proyectos."
  },
  defaultRetry: {
    retryMessage: "Mmm, no pude procesarlo por completo. ¿Podrías intentar tu consulta de nuevo?"
  }
};



const de = {
  heroTitle: "Willkommen beim Berechtigungsauditor",
  heroSubtitle: "Starte den Assistenten, um Einblicke zu erhalten, und chatte für eine vertiefte Analyse.",
  specRows: [
    {
      id: "solves", label: "Was wird gelöst:", links: [
        "Zu viele Admins, unsichere Rollen, Berechtigungsüberschneidungen, fehlende Transparenz und Compliance-Risiken."
      ]
    },
    {
      id: "who", label: "Für wen:", links: [
        "Sicherheit/Compliance, Jira-Administratoren, Projektleiter, IT-Architektur und Revision/Management."
      ]
    },
    {
      id: "inside", label: "Was jede App enthält:", links: [
        "Problem, Personas, Funktionen, KI-Mehrwert, Metriken, Dev-Notizen, Abhängigkeiten, GTM."
      ]
    },
    {
      id: "ai", label: "KI in Aktion:", links: [
        "Scannen, Prüfen, Risikoanalyse, Empfehlungen und kontinuierliche Optimierung."
      ]
    },
    {
      id: "build", label: "Schneller entwickeln & integrieren:", links: [
        "Jira-API-Karten, Abfrage-Patterns, Backend/Sync, UI-Bausteine, Caching."
      ]
    },
    {
      id: "measure", label: "Wirkung messen:", links: [
        "Berichte zu Risiken, Compliance-Score, Sicherheitsmetriken, Trendanalysen."
      ]
    },
  ],
  ctas: {
    run: "Assistent zur Berechtigungsprüfung starten",
    rescan: "Analyse erneut ausführen",
    analyse: "Analysieren",
    moreApps: "Weitere von uns",
    contactUs: "Kontakt aufnehmen",
  },
  moreApps: {
    title: "Weitere Apps von Uns",
    subtitle: "Entdecke unsere Suite leistungsstarker Atlassian-Apps",
    drawerTitle: "Weitere Apps von Uns",
    featuredTitle: "Empfohlene Apps",
    footer: "Alle Apps werden mit ❤️ von unserem Team entwickelt"
  },
  assistant: {
    title: "Willkommen beim Berechtigungsauditor",
    subtitle: "Fragen zu Rollen, Berechtigungen oder Risiken?",
    quickActions: [
      { id: "unused", label: "Admin-Berechtigungen prüfen", icon: "shield" },
      { id: "inactive", label: "Verwaiste Konten finden", icon: "users" },
      { id: "usage", label: "Rollen & Gruppen analysieren", icon: "sliders" },
      { id: "savings", label: "Sicherheitslücken aufdecken", icon: "lock" },
    ],
    inputPlaceholder: "Ihre Anfrage eingeben",
  },
  chat: {
    suggestionsTitle: "Vorgeschlagene Folgefragen:",
    followUps: [
      "Welche Nutzer haben globale Adminrechte?",
      "Welche Projekte haben unsichere Rollen-Zuweisungen?",
    ],
    networkErrorTitle: "Netzwerkfehler: Keine Verbindung zum Server.",
    networkErrorHint: "Bitte prüfen, ob das Backend läuft",
    needMoreHelp: "Weitere Hilfe benötigt?",
    contactUs: "Kontakt aufnehmen",
    waitingMessages: [
      "🔄 Alle Berechtigungsschemata werden gescannt...",
      "🛡️ Benutzerrollen und Zugriffsrechte werden geprüft...",
      "🔍 Verborgene Admin-Rechte werden überprüft...",
      "📊 Benutzer, Gruppen und Rollen werden zugeordnet...",
      "🚦 Riskante Berechtigungsüberschneidungen werden erkannt...",
      "🧩 Projekt-Zugriffsebenen werden zusammengesetzt...",
      "⚙️ Globale vs. Projekt-Berechtigungen werden überprüft...",
      "📡 Benutzerzugriffe über Gruppen werden nachverfolgt...",
      "🔐 Übermäßige Berechtigungen werden identifiziert...",
      "🕵️ Suche nach unautorisierten Zugriffsrisiken...",
      "📑 Details der Berechtigungsschemata werden analysiert...",
      "🗂️ Benutzer werden mit Gruppen abgeglichen...",
      "🏗️ Strukturen der Berechtigungsschemata werden validiert...",
      "🧭 Orientierung zur Minimalberechtigung...",
      "⚡ Kritische Sicherheitslücken werden hervorgehoben...",
      "🛠️ Konsistenz über Projekte hinweg wird geprüft...",
      "📌 Wer mächtige Rollen hat, wird ermittelt...",
      "🛰️ Geerbte Berechtigungen werden nachverfolgt...",
      "🔮 Potenzielle Compliance-Risiken werden vorhergesagt...",
      "🚀 Sicherheit für sichere Projekte wird gestärkt..."
    ]
  },
  labels: {
    lastScanned: "Zuletzt gescannt:",
    scanningProgress: "Scanne Projekt {current} von {total}"
  },
  defaultRetry: {
    retryMessage: "Hmm, das konnte ich nicht vollständig verarbeiten. Bitte versuchen Sie Ihre Anfrage erneut."
  }
};



// Helper: map locale → language pack (default to English)
export function getPermissionAuditorContent(locale) {
  try {
    const raw = String(locale || "en").toLowerCase().replace(/[-_]/g, "_");
    const lang = raw.split("_")[0]; // "en_US" -> "en"

    // console.log('Resolving content for locale:', locale, '-> language:', lang);

    if (lang === "fr") return fr;
    if (lang === "es") return es;
    if (lang === "de") return de;

    // console.log('Using default English content pack');
    return en;
  } catch (error) {
    console.warn('Error resolving content for locale:', locale, error);
    return en; // Fallback to English
  }
}

export const packs = { en, fr, es, de };
