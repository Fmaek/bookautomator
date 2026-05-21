import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_AUTHOR = `Tu es un auteur professionnel francophone publié chez de grands éditeurs.
RÈGLES ABSOLUES — ne jamais enfreindre:
- Texte fluide et naturel, JAMAIS de markdown
- INTERDIT: astérisques (**gras**), dièses (## titre), tirets de liste (- item)
- Pas de titres ni sous-titres dans le corps du texte
- Pas de listes à puces ni numérotées
- Prose continue, paragraphes naturels, comme un vrai livre publié
- Vocabulaire riche, chaque phrase est intentionnelle
Toujours en français impeccable.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    // ── PLAN ──────────────────────────────────────────────────────────────────
    if (action === "plan") {
      const { title, category, description, style } = body;
      const isPoem = category?.includes("Poési");
      const styleNote = style ? `Style d'écriture: ${style}.` : "";
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en création de livres à succès. Réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: isPoem
            ? `Crée un recueil de 10-12 poèmes pour ce livre en français.
Titre: "${title}" ${styleNote}
Réponds UNIQUEMENT avec ce JSON: {"chapters": ["Titre poème 1", ...]}`
            : `Crée un plan de 7-9 chapitres percutants pour ce livre en français.
Titre: "${title}" | Catégorie: ${category || "Non-fiction"} | Brief: ${description || "Livre pratique"} ${styleNote}
Titres accrocheurs, pas juste "Chapitre 1".
Réponds UNIQUEMENT avec ce JSON: {"chapters": ["Titre 1", "Titre 2", ...]}` },
        ],
        temperature: 0.8, max_tokens: 1024,
      });
      const text = completion.choices[0].message.content?.trim() || "{}";
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    // ── CHAPTER ───────────────────────────────────────────────────────────────
    if (action === "chapter") {
      const { title, chapterTitle, chapterIndex, totalChapters, category, style } = body;
      const isPoem = category?.includes("Poési");
      const isKids = category?.includes("enfant");
      const isColoring = category?.includes("coloriage");
      const isRiddle = category?.includes("nigme");

      if (isColoring) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu crées des livres de coloriage pour enfants. Décris des scènes simples et amusantes à colorier." },
            { role: "user", content: `Scène de coloriage ${chapterIndex}/${totalChapters} du livre "${title}": "${chapterTitle}".
Décris une scène simple et colorée pour enfant 3-8 ans.
Format:
- SCÈNE: (description visuelle de ce qu'il faut dessiner/colorier)
- CONSIGNE: (instruction simple pour l'enfant)
- COULEURS SUGGÉRÉES: (liste de 4-5 couleurs)
- NIVEAU: (Facile / Moyen)
Utilise un langage ultra simple et joyeux.` },
          ],
          temperature: 0.8, max_tokens: 600,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      if (isRiddle) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu crées des livres d'énigmes, devinettes et charades en français pour enfants et adultes." },
            { role: "user", content: `Crée 8-10 énigmes/devinettes sur le thème "${chapterTitle}" pour le livre "${title}".
Section ${chapterIndex}/${totalChapters}.
Mix: devinettes classiques, charades, rébus décrits, énigmes logiques.
Format: **ÉNIGME:** [énoncé] | **RÉPONSE:** [réponse] (en dessous, en petits caractères ou inversé)
Niveau de difficulté varié: facile à difficile.` },
          ],
          temperature: 0.8, max_tokens: 1500,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      if (isKids) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu écris des histoires pour enfants de 3-8 ans. Phrases très courtes, vocabulaire simple, beaucoup d'action et d'émotions. Toujours positif et éducatif." },
            { role: "user", content: `Écris le chapitre ${chapterIndex}/${totalChapters} du livre enfant "${title}".
Titre: "${chapterTitle}"
- Maximum 200 mots par chapitre
- Phrases de 5-8 mots maximum
- Un seul concept par page
- Beaucoup de dialogue et d'action
- Termine sur une note positive ou une question pour l'enfant` },
          ],
          temperature: 0.85, max_tokens: 800,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      if (isPoem) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_AUTHOR },
            { role: "user", content: `Écris le poème "${chapterTitle}" du recueil "${title}" (${chapterIndex}/${totalChapters}).
20-30 vers, images fortes, rythme soutenu, strophes de 4-6 vers.
Langage poétique dense, métaphores originales. Termine sur une image inoubliable.
Aucun astérisque, aucun tiret de liste, aucun titre.` },
          ],
          temperature: 0.9, max_tokens: 2048,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      const stylePrompts: Record<string, string> = {
        "Motivant": `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un coach qui parle directement au lecteur avec énergie et conviction totale.
Tutoie le lecteur tout au long. Commence par une histoire vraie ou une situation que le lecteur a déjà vécue — il doit se reconnaître dès la première ligne.
Développe une ou deux idées fortes en profondeur : montre le problème, puis offre une clé de transformation concrète avec un exemple de vie réelle.
Utilise des images puissantes, des comparaisons frappantes. Interpelle, challenge, secoue le lecteur avec bienveillance.
Conclus par un appel à l'action court et percutant qui donne envie d'agir maintenant.
600 à 800 mots, paragraphes courts de 2 à 4 lignes, rythme vif et enlevé.`,

        "Storytelling": `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un narrateur expert qui captive comme un romancier. Plonge le lecteur dans une scène concrète et visuelle dès la première phrase — on voit, on entend, on ressent.
Développe l'histoire avec personnages, situation, tension progressive et révélation.
Alterne moments d'immersion narrative et insights subtils sans jamais rompre le flux.
Le lecteur vit la situation plutôt que de la lire. La leçon émerge naturellement de l'histoire, sans être expliquée comme dans un manuel.
600 à 800 mots, style romanesque mais instructif, rythme cinématographique.`,

        "Académique": `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un essayiste rigoureux et accessible. Pose la thèse centrale du chapitre en ouverture avec une formulation nette et mémorable.
Développe avec une argumentation solide : faits vérifiables, données chiffrées, perspectives d'experts ou études pertinentes.
Construis un raisonnement progressif — chaque paragraphe ajoute une brique logique au précédent.
Conclure sur une synthèse qui élargit la réflexion.
600 à 800 mots, prose continue et dense mais aérée, comme un essai philosophique ou scientifique grand public.`,

        "Humoristique": `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un auteur brillant qui mélange humour fin et vraie substance. Commence par une anecdote absurde du quotidien ou une observation décalée que tout le monde reconnaît.
Mélange ironie subtile, auto-dérision et conseils pratiques réels. Le lecteur rit et apprend sans s'en rendre compte.
Ton conversationnel et décontracté, comme un ami intelligent et drôle qui partage ses découvertes autour d'un verre.
Évite le burlesque gratuit : chaque blague porte un vrai message.
600 à 800 mots, style fluide et vivant avec une vraie chute à la fin.`,

        "Dramatique": `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu écris avec une intensité cinématographique. Commence par une révélation-choc ou une situation de crise viscérale — le lecteur doit sentir l'urgence dès les premiers mots.
Maintiens une tension narrative permanente : chaque paragraphe dévoile quelque chose qui amplifie l'enjeu.
Utilise des images fortes, un vocabulaire puissant et émotionnel. Fais ressentir les enjeux dans le corps du lecteur.
Construis vers un moment de vérité, une prise de conscience intense.
600 à 800 mots, langue tendue, rythme haletant, prose dramatique continue.`,
      };

      const chapterPrompt = stylePrompts[style] || `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".
Commence par une accroche forte qui capture l'attention immédiatement.
Développe avec profondeur, des exemples concrets et une progression naturelle.
Termine par une phrase mémorable qui donne envie de lire la suite.
600 à 800 mots, prose fluide et engageante.`;

      const noMarkdownReminder = `

RÈGLE ABSOLUE: aucun astérisque, aucun dièse, aucun tiret de liste, aucun sous-titre. Prose continue uniquement, comme dans un livre imprimé.`;

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: chapterPrompt + noMarkdownReminder },
        ],
        temperature: 0.88, max_tokens: 2048,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }

    // ── REGENERATE SINGLE CHAPTER ─────────────────────────────────────────────
    if (action === "regenerate") {
      const { title, chapterTitle, chapterIndex, totalChapters, category, style, instruction } = body;
      const isPoem = category?.includes("Poési");
      const styleNote = style ? `Style imposé: ${style}.` : "";
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: isPoem
            ? `Réécris le poème "${chapterTitle}" du recueil "${title}" avec une approche totalement différente. ${instruction || "Version plus émotionnelle et imagée."} Aucun astérisque ni tiret.`
            : `Réécris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}" avec un angle entièrement nouveau.
${instruction ? `Instruction spécifique: ${instruction}` : "Nouveaux exemples, nouvelle entrée en matière, perspective différente."}
${styleNote}
600 à 800 mots, prose fluide et naturelle. Aucun astérisque, aucun sous-titre, aucune liste.` },
        ],
        temperature: 0.92, max_tokens: 2048,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }

    // ── IMPROVE ───────────────────────────────────────────────────────────────
    if (action === "improve") {
      const { text } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un éditeur littéraire professionnel. Améliore le texte: fluidité, impact, vocabulaire, rythme. Garde le sens et la longueur approximative. Supprime tous les astérisques, tirets de liste et marqueurs markdown. Retourne UNIQUEMENT le texte amélioré en prose continue." },
          { role: "user", content: text },
        ],
        temperature: 0.6, max_tokens: 4096,
      });
      return NextResponse.json({ improved: completion.choices[0].message.content || text });
    }

    // ── DESCRIPTION ───────────────────────────────────────────────────────────
    if (action === "description") {
      const { title, category, chaptersPreview } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en marketing éditorial. Tu écris des descriptions qui font exploser les ventes." },
          { role: "user", content: `3 descriptions pour: "${title}" (${category || "Non-fiction"})
Chapitres: ${chaptersPreview || ""}

--- COURTE ---
[50 mots max — résultats de recherche]

--- MEDIUM ---
[120 mots — page produit principale]

--- LONGUE ---
[250 mots — accroche émotionnelle + promesse + contenu + appel à l'action]` },
        ],
        temperature: 0.8, max_tokens: 2048,
      });
      return NextResponse.json({ description: completion.choices[0].message.content || "" });
    }

    // ── QUOTES EXTRACTOR ──────────────────────────────────────────────────────
    if (action === "quotes") {
      const { title, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en extraction de citations percutantes pour les réseaux sociaux." },
          { role: "user", content: `Extrait les 10 meilleures citations/phrases du livre "${title}".
Critères: courtes (max 2 lignes), percutantes, partageables sur Instagram/Facebook.
Format: une citation par ligne, précédée d'un numéro. Pas de guillemets superflus.

Contenu du livre:
${content.substring(0, 6000)}` },
        ],
        temperature: 0.5, max_tokens: 1024,
      });
      return NextResponse.json({ quotes: completion.choices[0].message.content || "" });
    }

    // ── SOCIAL MEDIA POSTS ────────────────────────────────────────────────────
    if (action === "social") {
      const { title, description, category, platform, tone } = body;
      const prompts: Record<string, string> = {
        instagram: `Crée 3 posts Instagram pour le livre "${title}" (${category}).
Description: ${description}
Chaque post: accroche forte + contenu engageant + appel à l'action + 15-20 hashtags pertinents.
Ton: ${tone || "inspirant"}. Emojis inclus. Sépare chaque post par ---`,
        facebook: `Crée 3 posts Facebook longs (300-500 mots) pour promouvoir le livre "${title}".
Description: ${description}
Style: storytelling + valeur ajoutée + curiosité + appel à acheter. Ton: ${tone || "authentique"}.
Sépare chaque post par ---`,
        twitter: `Crée un thread Twitter de 10 tweets sur le thème du livre "${title}".
Description: ${description}
Tweet 1: accroche virale. Tweets 2-9: conseils/idées de valeur. Tweet 10: CTA.
Numéroter 1/ 2/ etc. Ton: ${tone || "direct et percutant"}.`,
        tiktok: `Crée 5 scripts courts TikTok/Reels (30-45 secondes) pour le livre "${title}".
Chaque script: accroche choc (3 sec) + développement rapide + CTA final.
Format: ACCROCHE: ... | CONTENU: ... | CTA: ...
Ton: ${tone || "dynamique et authentique"}.`,
        linkedin: `Crée 2 posts LinkedIn professionnels pour le livre "${title}" (${category}).
Description: ${description}
Style: expertise + insights + valeur business + networking. 400-600 mots. Ton: ${tone || "professionnel"}.
Sépare par ---`,
      };
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en marketing digital et copywriting pour les réseaux sociaux. Tu crées du contenu viral en français." },
          { role: "user", content: prompts[platform] || prompts.instagram },
        ],
        temperature: 0.85, max_tokens: 3000,
      });
      return NextResponse.json({ posts: completion.choices[0].message.content || "" });
    }

    // ── EMAIL MARKETING ────────────────────────────────────────────────────────
    if (action === "email") {
      const { title, description, type, authorName } = body;
      const types: Record<string, string> = {
        launch: `Écris un email de lancement pour le livre "${title}" signé par ${authorName || "l'auteur"}.
Description: ${description}
Structure: objet accrocheur + histoire personnelle + valeur du livre + offre spéciale lancement + CTA urgent.
Longueur: 400-600 mots. Format: OBJET: [objet] | [corps de l'email]`,
        followup: `Écris une séquence de 5 emails de suivi pour vendre "${title}".
Email 1 (J+0): bienvenue + cadeau (chapitre gratuit)
Email 2 (J+2): valeur + conseil du livre
Email 3 (J+4): témoignage/résultat + offre
Email 4 (J+6): lever une objection + garantie
Email 5 (J+8): dernière chance + urgence
Chaque email: OBJET: + CORPS: (200-300 mots). Sépare par ---`,
        review: `Écris un email pour demander un avis/témoignage sur le livre "${title}" à un lecteur.
Ton: chaleureux, non intrusif, reconnaissant. 150-200 mots.
Format: OBJET: [objet] | [corps]`,
        podcast: `Écris un email de pitch pour devenir invité dans un podcast en parlant du livre "${title}".
Description: ${description}
Ton: professionnel, confiant, valeur pour l'audience. 200-250 mots.
Format: OBJET: [objet] | [corps]`,
      };
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en email marketing et copywriting. Tu crées des emails qui convertissent en français." },
          { role: "user", content: types[type] || types.launch },
        ],
        temperature: 0.8, max_tokens: 3000,
      });
      return NextResponse.json({ email: completion.choices[0].message.content || "" });
    }

    // ── SEO KEYWORDS ──────────────────────────────────────────────────────────
    if (action === "seo") {
      const { title, category, description } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en SEO pour Amazon KDP et Kobo. Tu connais les algorithmes de recherche des librairies en ligne." },
          { role: "user", content: `Optimisation SEO pour le livre: "${title}" (${category}).
Description: ${description || ""}

Fournis:
1. 7 MOTS-CLÉS AMAZON (un par ligne, du plus au moins important — max 50 caractères chacun)
2. 2 CATÉGORIES AMAZON recommandées (chemin complet)
3. TITRE OPTIMISÉ (avec sous-titre SEO si pertinent)
4. 5 MOTS-CLÉS KOBO
5. SCORE DE COMPÉTITION estimé (1-10) avec explication` },
        ],
        temperature: 0.5, max_tokens: 1024,
      });
      return NextResponse.json({ seo: completion.choices[0].message.content || "" });
    }

    // ── AUTHOR BIO ────────────────────────────────────────────────────────────
    if (action === "bio") {
      const { authorName, expertise, books } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu écris des biographies d'auteurs professionnelles et engageantes en français." },
          { role: "user", content: `Écris 3 biographies pour l'auteur: ${authorName}
Expertise/domaine: ${expertise || "auteur indépendant"}
Livres: ${books || "auteur"}

--- COURTE (50 mots) --- pour Amazon KDP
--- MEDIUM (120 mots) --- pour les plateformes
--- LONGUE (250 mots) --- pour le site web et presse` },
        ],
        temperature: 0.75, max_tokens: 1500,
      });
      return NextResponse.json({ bio: completion.choices[0].message.content || "" });
    }

    // ── FAQ GENERATOR ─────────────────────────────────────────────────────────
    if (action === "faq") {
      const { title, category, description } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en création de contenu FAQ pour les livres et la vente en ligne." },
          { role: "user", content: `Génère une FAQ de 10 questions-réponses pour le livre "${title}" (${category}).
Description: ${description || ""}
Questions que se posent les acheteurs potentiels. Réponses: 2-4 phrases, rassurantes et vendeuses.
Format: **Q: [question]** | R: [réponse]` },
        ],
        temperature: 0.7, max_tokens: 2000,
      });
      return NextResponse.json({ faq: completion.choices[0].message.content || "" });
    }

    // ── READING ANALYSIS ──────────────────────────────────────────────────────
    if (action === "analyze") {
      const { content, title } = body;
      const wordCount = content.split(/\s+/).length;
      const readingMinutes = Math.round(wordCount / 200);
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse littéraire et éditoriale." },
          { role: "user", content: `Analyse ce livre "${title}" sur les critères suivants:
1. NIVEAU DE LECTURE (Débutant/Intermédiaire/Expert)
2. TON DOMINANT (liste 3 adjectifs)
3. POINTS FORTS (3 points)
4. AXES D'AMÉLIORATION (3 suggestions)
5. SCORE COMMERCIAL /10 avec justification
6. PUBLIC CIBLE idéal (2-3 phrases)

Extrait du livre (premiers 2000 mots):
${content.substring(0, 2000)}` },
        ],
        temperature: 0.5, max_tokens: 1000,
      });
      return NextResponse.json({
        analysis: completion.choices[0].message.content || "",
        wordCount,
        readingMinutes,
        pages: Math.round(wordCount / 250),
      });
    }

    // ── CONTENT CALENDAR ──────────────────────────────────────────────────────
    if (action === "calendar") {
      const { title, launchDate, platforms } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en stratégie de lancement de livres et marketing de contenu." },
          { role: "user", content: `Crée un calendrier de contenu 30 jours pour le lancement du livre "${title}".
Date de lancement: ${launchDate || "dans 2 semaines"}
Plateformes: ${platforms || "Instagram, Facebook, TikTok"}

J-14 au J0: pré-lancement (teasing, extraits, coulisses)
J0: lancement (annonces, posts de lancement)
J+1 à J+14: post-lancement (témoignages, FAQ, contenus de valeur)

Format tableau: JOUR | PLATEFORME | TYPE DE CONTENU | IDÉE PRINCIPALE` },
        ],
        temperature: 0.7, max_tokens: 2000,
      });
      return NextResponse.json({ calendar: completion.choices[0].message.content || "" });
    }

    // ── NICHE RESEARCH ────────────────────────────────────────────────────────
    if (action === "niche") {
      const { niche, category } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse de marché éditorial numérique et en publishing indépendant." },
          { role: "user", content: `Analyse le potentiel commercial de cette niche pour l'édition numérique:
Niche: "${niche}" | Catégorie: ${category || "Non-fiction"}

Analyse:
1. TAILLE DU MARCHÉ (estimation)
2. NIVEAU DE COMPÉTITION (Faible/Moyen/Fort + explication)
3. ACHETEURS TYPES (2-3 profils détaillés)
4. PRIX OPTIMAL recommandé
5. 5 ANGLES D'ATTAQUE originaux pour se démarquer
6. 3 TITRES ACCROCHEURS suggérés
7. POTENTIEL REVENU estimé (1ère année)
8. SCORE OPPORTUNITÉ /10` },
        ],
        temperature: 0.7, max_tokens: 1500,
      });
      return NextResponse.json({ niche: completion.choices[0].message.content || "" });
    }

    // ── SERIES PLANNER ────────────────────────────────────────────────────────
    if (action === "series") {
      const { title, category, nbBooks } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en création de séries de livres et en stratégie éditoriale." },
          { role: "user", content: `Crée un plan de série de ${nbBooks || 3} livres autour du thème: "${title}" (${category || "Non-fiction"}).

Pour chaque tome:
- TITRE accrocheur
- SOUS-TITRE
- THÈME CENTRAL
- 5 CHAPITRES CLÉS
- LIEN avec les autres tomes
- ORDRE DE LECTURE recommandé

La série doit créer une progression logique et donner envie de lire le suivant.` },
        ],
        temperature: 0.8, max_tokens: 2000,
      });
      return NextResponse.json({ series: completion.choices[0].message.content || "" });
    }

    // ── CHAPTER SUMMARY ───────────────────────────────────────────────────────
    if (action === "summary") {
      const { chapterTitle, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu résumes des chapitres de livres en 3-4 phrases claires et percutantes." },
          { role: "user", content: `Résume ce chapitre "${chapterTitle}" en 3-4 phrases clés. Points essentiels à retenir:\n\n${content.substring(0, 3000)}` },
        ],
        temperature: 0.4, max_tokens: 300,
      });
      return NextResponse.json({ summary: completion.choices[0].message.content || "" });
    }

    // ── PODCAST EPISODE PLANNER ───────────────────────────────────────────────
    if (action === "podcast") {
      const { chapterTitle, content, bookTitle, chapterIndex } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en podcasting et en adaptation de contenu de livre pour le format audio." },
          { role: "user", content: `Crée un plan d'épisode de podcast basé sur ce chapitre du livre "${bookTitle}".
Chapitre ${chapterIndex}: "${chapterTitle}"

Extrait du chapitre:
${(content || "").substring(0, 2000)}

Structure l'épisode ainsi:
## 🎙️ TITRE DE L'ÉPISODE
[titre accrocheur, différent du chapitre]

## ⏱️ DURÉE ESTIMÉE
[X-Y minutes]

## 🪝 ACCROCHE (0-30 sec)
[phrase d'accroche percutante pour capter l'attention immédiatement]

## 📋 INTRO (30 sec - 2 min)
[présentation du sujet + ce que l'auditeur va apprendre]

## 🔑 POINTS CLÉS (liste de 4-6 avec développement)
1. [Point + développement oral (2-3 phrases)]
2. ...

## 💡 ANECDOTE / EXEMPLE CONCRET
[histoire courte ou exemple à raconter]

## ❓ QUESTIONS POUR UN INVITÉ (si applicable)
[3-5 questions si tu avais un expert en invité]

## 🎯 CALL TO ACTION FINAL
[invitation à acheter le livre / s'abonner / partager]

## 📝 NOTES DE PRÉPARATION
[conseils de présentation, ton recommandé, points à ne pas oublier]` },
        ],
        temperature: 0.8, max_tokens: 2000,
      });
      return NextResponse.json({ podcast: completion.choices[0].message.content || "" });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
