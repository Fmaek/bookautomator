import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_AUTHOR = `Tu es un auteur professionnel francophone publiÃ© chez de grands Ã©diteurs.
RÃˆGLES ABSOLUES â€” ne jamais enfreindre:
- Texte fluide et naturel, JAMAIS de markdown
- INTERDIT: astÃ©risques (**gras**), diÃ¨ses (## titre), tirets de liste (- item)
- Pas de titres ni sous-titres dans le corps du texte
- Pas de listes Ã  puces ni numÃ©rotÃ©es
- Prose continue, paragraphes naturels, comme un vrai livre publiÃ©
- Vocabulaire riche, chaque phrase est intentionnelle
Toujours en franÃ§ais impeccable.`;

const NO_MARKDOWN = `RÃˆGLE ABSOLUE DE FORMATAGE: N'utilise JAMAIS de markdown dans ta rÃ©ponse.
INTERDIT: **gras**, *italique*, ## titres, ### sous-titres, # h1, - listes Ã  puces, * listes.
Utilise uniquement du texte brut. Pour les titres: Ã©cris-les en MAJUSCULES suivis de deux-points.
Pour les listes: numÃ©rotation simple (1. 2. 3.) ou tirets simples sans espacement excessif.`;

/** Supprime tous les marqueurs markdown d'une chaÃ®ne de texte */
function cleanText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // **gras** â†’ texte
    .replace(/\*([^*]+)\*/g, "$1")        // *italique* â†’ texte
    .replace(/^#{1,6}\s+/gm, "")          // ## titres â†’ supprimÃ©
    .replace(/^>\s+/gm, "")               // > citations â†’ supprimÃ©
    .replace(/`{1,3}[^`]*`{1,3}/g, "")   // `code` â†’ supprimÃ©
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [lien](url) â†’ texte
    .trim();
}

/** Extrait le premier objet JSON valide d'une chaÃ®ne */
function extractJson(raw: string): string {
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Try object first (most API responses return an object), then array
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  return arrMatch ? arrMatch[0] : "{}";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY manquant" }, { status: 503 });
  const groq = new Groq({ apiKey });

  const body = await req.json();
  const { action } = body;

  try {
    // â”€â”€ PLAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "plan") {
      const { title, category, description, style, novelCharacters, novelTwists, novelUniverse, novelGenre } = body;
      const isPoem = category?.includes("Poési");
      const isNovel = category?.includes("Roman");
      const styleNote = style ? `Style d'écriture: ${style}.` : "";

      if (isNovel) {
        const charLines = ((novelCharacters || []) as {name:string;role:string;desc:string}[])
          .filter((c: {name:string;role:string;desc:string}) => c.name || c.desc)
          .map((c: {name:string;role:string;desc:string}) => `- ${c.role}${c.name ? ` (${c.name})` : ""}: ${c.desc || "à définir"}`)
          .join("\n");
        const twistsList = ((novelTwists || []) as string[]).filter((t: string) => t.trim());
        const twistsLine = twistsList.length > 0
          ? twistsList.map((t: string, i: number) => `Plot Twist ${i + 1}: ${t}`).join("\n")
          : "";

        const novelCompletion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu es un romancier expert (prix littéraire, best-seller international). Tu réponds UNIQUEMENT en JSON valide, sans markdown." },
            { role: "user", content: `Crée le plan complet d'un roman en 3 actes pour ce projet:\n\nTITRE: "${title}"\nGENRE: ${novelGenre || "Drame"}\nUNIVERS / LIEU / ÉPOQUE: ${novelUniverse || "contemporain"}\nTHÈME CENTRAL: ${description || "à définir"}\n\nPERSONNAGES:\n${charLines || "À développer selon le genre"}\n\nPLOT TWISTS À PLACER:\n${twistsLine || "Invente 2 plot twists puissants adaptés au genre"}\n\nINSTRUCTIONS:\n- 10 à 12 chapitres (pas plus, pas moins)\n- Structure en 3 actes: Acte I (ch. 1-3: mise en place + conflit initial), Acte II (4-9: montée en tension, retournements), Acte III (10-12: climax + résolution)\n- Place les plot twists aux moments narrativement les plus forts — ÉVITE le milieu exact et l'avant-dernier chapitre (trop prévisibles). Choisis des positions inattendues qui maximisent l'impact
- Si les noms, prénoms ou genres des personnages ne sont pas fournis ou incomplets, invente-les intégralement (physique précis, psychologie profonde, secret caché, arc narratif complet) en parfaite cohérence avec le genre et l'univers du roman
- Si aucun plot twist n'est spécifié, crée un retournement narratif INATTENDU et PROFONDÉMENT ancré dans les thèmes et personnages — quelque chose que le lecteur n'aurait jamais anticipé mais qui paraît évident a posteriori. Le twist doit changer la lecture de tout ce qui précède.
- Indique dans la bible à quels chapitres tu as placé chaque plot twist et pourquoi ce choix\n- Titres de chapitres évocateurs, cinématographiques, jamais "Chapitre 1"\n- La bible doit inclure pour chaque personnage: nom complet, âge, physique, psychologie, secret, arc narratif\n- Réponds UNIQUEMENT avec ce JSON valide:\n{\n  "chapters": ["Titre ch.1", "Titre ch.2", ...],\n  "bible": "BIBLE DES PERSONNAGES:\n\n[contenu complet]\n\nSTRUCTURE NARRATIVE:\n[résumé acte par acte]"\n}` },
          ],
          temperature: 0.85, max_tokens: 2500,
        });
        const novelText = novelCompletion.choices[0].message.content?.trim() || "{}";
        const novelJsonStr = extractJson(novelText);
        try {
          return NextResponse.json(JSON.parse(novelJsonStr));
        } catch {
          return NextResponse.json({ chapters: ["Prologue", "L'éveil", "Les ombres", "Premier sang", "Le retournement", "Nuit profonde", "Alliances brisées", "La vérité surgit", "Effondrement", "Rédemption", "L'ultime choix", "Épilogue"], bible: "" });
        }
      }

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en création de livres à succès. Réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: isPoem
            ? `Crée un recueil de 10-12 poèmes pour ce livre en français.\nTitre: "${title}" ${styleNote}\nRéponds UNIQUEMENT avec ce JSON: {"chapters": ["Titre poème 1", ...]}`
            : `Crée un plan de 8-10 chapitres percutants pour ce livre en français.
Titre: "${title}" | Catégorie: ${category || "Non-fiction"} | Brief: ${description || ""}
${styleNote}
RÈGLES:
- Titres spécifiques et évocateurs (jamais "Introduction", "Conclusion" génériques, jamais "Chapitre 1")
- Chaque titre reflète exactement le contenu du chapitre
- Structure progressive et logique adaptée à la catégorie
- Business/Entrepreneuriat: chaque titre = une stratégie actionnable, résultats mesurables, cas concrets, ROI
- Développement personnel: transformation progressive, avant/après viscéral, prises de conscience, exercice pratique par chapitre
- Santé/Bien-être: protocoles accessibles, bénéfices prouvés, science vulgarisée, habitudes quotidiennes
- Spiritualité: profondeur existentielle, quête intérieure, symboles puissants, révélations progressives, méditations
- Finance/Investissement: chiffres concrets, étapes reproductibles, erreurs à éviter, stratégies claires
- Poésie: titres poétiques évocateurs, variété émotionnelle et thématique forte
- Enfant: aventures simples, leçons de vie implicites, personnages attachants
- Cuisine: chapitres = recettes ou techniques, progression du simple au complexe, variété des plats
- Technologie: titres concrets et actionnables, progression logique, cas d'usage pratiques
- Développement enfants: chapitres par compétence ou étape de développement, conseils parents concrets
- Si le brief décrit un roman ou personnages, adapte en conséquence
${body.categoryFocus ? `- FOCUS DEMANDÉ PAR L'AUTEUR: ${body.categoryFocus}` : ""}
Réponds UNIQUEMENT avec ce JSON: {"chapters": ["Titre 1", "Titre 2", ...]}` },
        ],
        temperature: 0.8, max_tokens: 1024,
      });
      const text = completion.choices[0].message.content?.trim() || "{}";
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }


    // â”€â”€ CHAPTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "chapter") {
      const { title, chapterTitle, chapterIndex, totalChapters, category, style } = body;
      const isNovel = category?.includes("Roman");

      if (isNovel) {
        const { novelBible, novelGenre, novelTwists: chNovelTwists, description } = body;
        const act = chapterIndex <= 3 ? "Acte I — Mise en place" : chapterIndex <= 9 ? "Acte II — Confrontation et montée en tension" : "Acte III — Climax et résolution";
        // Let the bible (generated by plan) specify twist placement
        const twistNote = "";

        const novelStylePrompts: Record<string, string> = {
          "Immersif & sensoriel": "Écris avec une richesse sensorielle totale — ce que les personnages voient, sentent, entendent, touchent, goûtent. Chaque scène doit ancrer le lecteur physiquement dans l'espace. Les émotions passent par le corps et les sens, jamais par de l'explication directe.",
          "Psychologique": "Plonge dans la psychologie profonde des personnages. Monologue intérieur, pensées contradictoires, failles, refoulé. Le drame se passe autant dans les têtes qu'à l'extérieur. Peu d'action visible, beaucoup de profondeur intérieure.",
          "Cinématographique": "Écris comme un scénario de film : coupes nettes, plans séquences, dialogues secs et percutants. Commence in medias res, dynamique visuelle forte, rythme haletant.",
          "Poétique": "Prose poétique, images métaphoriques, langage travaillé et musical. La beauté de la langue compte autant que l'histoire. Analogies profondes, phrases-images qui restent en mémoire.",
          "Haletant & tendu": "Rythme effréné, phrases courtes, action constante, révélations successives. Le lecteur ne peut pas poser le livre. Chaque fin de paragraphe crée une nouvelle tension ou question.",
        };
        const narrativeStyle = novelStylePrompts[style || ""] || novelStylePrompts["Cinématographique"];

        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: `Tu es un romancier de niveau international — prix Goncourt, best-seller New York Times. Tu maîtrises parfaitement la construction narrative, les arcs de personnages, le dialogue naturel, la tension dramatique. Tu écris en français avec une maîtrise littéraire totale. Tu n'utilises JAMAIS d'astérisques, de titres en gras, de tirets de liste. Que de la prose littéraire pure.` },
            { role: "user", content: `Écris le chapitre ${chapterIndex} sur ${totalChapters} du roman "${title}" (genre: ${novelGenre || "Drame"}).

TITRE DU CHAPITRE: "${chapterTitle}"
POSITION DANS L'HISTOIRE: ${act} (chapitre ${chapterIndex}/${totalChapters})
THÈME DU ROMAN: ${description || ""}

BIBLE DES PERSONNAGES ET STRUCTURE NARRATIVE:
${novelBible || "Personnages à définir selon le contexte du roman"}${twistNote}

STYLE NARRATIF À APPLIQUER:
${narrativeStyle}

RÈGLES ABSOLUES:
- Écris au rythme naturel du chapitre — sans quota de mots, seulement ce que la scène et les personnages exigent
- Commence par une scène concrète et immersive, pas par une description générale
- Dialogue naturel et révélateur de caractère (minimum 3 échanges significatifs)
- Monologue intérieur d'au moins un personnage pour montrer sa psychologie
- Respecte scrupuleusement la bible des personnages (noms, traits, secrets, relations)
- Chaque chapitre doit faire avancer l'intrigue ET développer au moins un personnage
- Termine sur une phrase ou scène qui donne envie de lire la suite immédiatement
- Prose continue uniquement — zéro astérisque, zéro titre, zéro liste, zéro formatage markdown` },
          ],
          temperature: 0.9, max_tokens: 3500,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }


      const isPoem = category?.includes("PoÃ©si");
      const isKids = category?.includes("enfant");
      const isColoring = category?.includes("coloriage");
      const isRiddle = category?.includes("nigme");

      if (isColoring) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu crÃ©es des livres de coloriage pour enfants. DÃ©cris des scÃ¨nes simples et amusantes Ã  colorier." },
            { role: "user", content: `ScÃ¨ne de coloriage ${chapterIndex}/${totalChapters} du livre "${title}": "${chapterTitle}".
DÃ©cris une scÃ¨ne simple et colorÃ©e pour enfant 3-8 ans.
Format:
- SCÃˆNE: (description visuelle de ce qu'il faut dessiner/colorier)
- CONSIGNE: (instruction simple pour l'enfant)
- COULEURS SUGGÃ‰RÃ‰ES: (liste de 4-5 couleurs)
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
            { role: "system", content: "Tu crÃ©es des livres d'Ã©nigmes, devinettes et charades en franÃ§ais pour enfants et adultes." },
            { role: "user", content: `CrÃ©e 8-10 Ã©nigmes/devinettes sur le thÃ¨me "${chapterTitle}" pour le livre "${title}".
Section ${chapterIndex}/${totalChapters}.
Mix: devinettes classiques, charades, rÃ©bus dÃ©crits, Ã©nigmes logiques.
Format: **Ã‰NIGME:** [Ã©noncÃ©] | **RÃ‰PONSE:** [rÃ©ponse] (en dessous, en petits caractÃ¨res ou inversÃ©)
Niveau de difficultÃ© variÃ©: facile Ã  difficile.` },
          ],
          temperature: 0.8, max_tokens: 1500,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      if (isKids) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu Ã©cris des histoires pour enfants de 3-8 ans. Phrases trÃ¨s courtes, vocabulaire simple, beaucoup d'action et d'Ã©motions. Toujours positif et Ã©ducatif." },
            { role: "user", content: `Ã‰cris le chapitre ${chapterIndex}/${totalChapters} du livre enfant "${title}".
Titre: "${chapterTitle}"
- Phrases très courtes et simples
- Maximum 2 idées principales par chapitre, un seul fil narratif
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
            { role: "user", content: `Ã‰cris le poÃ¨me "${chapterTitle}" du recueil "${title}" (${chapterIndex}/${totalChapters}).
Court et dense, adapté à l'émotion du titre — sans longueur imposée, seulement ce qui est nécessaire. Images fortes, rythme soutenu, métaphores originales.
Termine sur une image inoubliable en une seule ligne.
Aucun astÃ©risque, aucun tiret de liste, aucun titre, aucun commentaire.` },
          ],
          temperature: 0.9, max_tokens: 500,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      const stylePrompts: Record<string, string> = {
        "Motivant": `Ã‰cris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un coach qui parle directement au lecteur avec Ã©nergie et conviction totale.
Tutoie le lecteur tout au long. Commence par une histoire vraie ou une situation que le lecteur a dÃ©jÃ  vÃ©cue â€” il doit se reconnaÃ®tre dÃ¨s la premiÃ¨re ligne.
DÃ©veloppe une ou deux idÃ©es fortes en profondeur : montre le problÃ¨me, puis offre une clÃ© de transformation concrÃ¨te avec un exemple de vie rÃ©elle.
Utilise des images puissantes, des comparaisons frappantes. Interpelle, challenge, secoue le lecteur avec bienveillance.
Conclus par un appel Ã  l'action court et percutant qui donne envie d'agir maintenant.
Paragraphes courts de 2 à 4 lignes, rythme vif et enlevé. Écris exactement autant que le sujet le demande — ni trop court ni gonflé.`,

        "Storytelling": `Ã‰cris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un narrateur expert qui captive comme un romancier. Plonge le lecteur dans une scÃ¨ne concrÃ¨te et visuelle dÃ¨s la premiÃ¨re phrase â€” on voit, on entend, on ressent.
DÃ©veloppe l'histoire avec personnages, situation, tension progressive et rÃ©vÃ©lation.
Alterne moments d'immersion narrative et insights subtils sans jamais rompre le flux.
Le lecteur vit la situation plutÃ´t que de la lire. La leÃ§on Ã©merge naturellement de l'histoire, sans Ãªtre expliquÃ©e comme dans un manuel.
Style romanesque mais instructif, rythme cinématographique. Développe autant que le récit l'exige.`,

        "AcadÃ©mique": `Ã‰cris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un essayiste rigoureux et accessible. Pose la thÃ¨se centrale du chapitre en ouverture avec une formulation nette et mÃ©morable.
DÃ©veloppe avec une argumentation solide : faits vÃ©rifiables, donnÃ©es chiffrÃ©es, perspectives d'experts ou Ã©tudes pertinentes.
Construis un raisonnement progressif â€” chaque paragraphe ajoute une brique logique au prÃ©cÃ©dent.
Conclure sur une synthÃ¨se qui Ã©largit la rÃ©flexion.
Prose continue et dense mais aérée, comme un essai philosophique ou scientifique grand public.`,

        "Humoristique": `Ã‰cris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu es un auteur brillant qui mÃ©lange humour fin et vraie substance. Commence par une anecdote absurde du quotidien ou une observation dÃ©calÃ©e que tout le monde reconnaÃ®t.
MÃ©lange ironie subtile, auto-dÃ©rision et conseils pratiques rÃ©els. Le lecteur rit et apprend sans s'en rendre compte.
Ton conversationnel et dÃ©contractÃ©, comme un ami intelligent et drÃ´le qui partage ses dÃ©couvertes autour d'un verre.
Ã‰vite le burlesque gratuit : chaque blague porte un vrai message.
Style fluide et vivant avec une vraie chute à la fin.`,

        "Dramatique": `Ã‰cris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Tu Ã©cris avec une intensitÃ© cinÃ©matographique. Commence par une rÃ©vÃ©lation-choc ou une situation de crise viscÃ©rale â€” le lecteur doit sentir l'urgence dÃ¨s les premiers mots.
Maintiens une tension narrative permanente : chaque paragraphe dÃ©voile quelque chose qui amplifie l'enjeu.
Utilise des images fortes, un vocabulaire puissant et Ã©motionnel. Fais ressentir les enjeux dans le corps du lecteur.
Construis vers un moment de vÃ©ritÃ©, une prise de conscience intense.
Langue tendue, rythme haletant, prose dramatique continue.`,
      };

            // Contexte du livre injecté dans chaque chapitre pour préserver les thèmes
      const { description, themes, savedStyleDescription, categoryFocus } = body;
      const themeContext = [
        description ? `DESCRIPTION DU LIVRE: ${description}` : "",
        themes      ? `THÈMES PRINCIPAUX À RESPECTER: ${themes}` : "",
        savedStyleDescription ? `STYLE PERSONNEL DE L'AUTEUR (reproduire fidèlement):\n${savedStyleDescription}` : "",
      ].filter(Boolean).join("\n");

      const noMarkdownReminder = `

RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE:
Aucun astérisque (*gras* ou **titre**). Aucun dièse (# ou ##). Aucun tiret de liste (- item). Aucun sous-titre visible dans le texte. Prose continue uniquement, paragraphes naturels, exactement comme un livre publié chez un grand éditeur.`;

      const basePrompt = stylePrompts[style] || `Écris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}".

Commence par une accroche forte, concrète et immédiate — une histoire vraie, une question percutante ou une situation que le lecteur reconnaît.
Développe l'idée principale avec profondeur : exemples réels, données, analogies frappantes. Montre, ne raconte pas.
Alterne entre explication, illustration et application pratique.
Termine par une synthèse mémorable et un pont vers la suite qui donne envie de continuer.
Prose fluide, paragraphes de 3-5 lignes, rythme naturel. Longueur adaptée au contenu — sans quota, ni trop court ni artificiellement gonflé.`;

      // Category guide injected per chapter
      let categoryGuide = "";
      if (category) {
        if (category.includes("Business") || category.includes("Entrepren"))
          categoryGuide = "\n\nGUIDE BUSINESS: Strategie actionnable par chapitre, exemples reels d'entrepreneurs, recapitulatif de l'action cle a mettre en place.";
        else if (category.includes("veloppement"))
          categoryGuide = "\n\nGUIDE DEVELOPPEMENT PERSONNEL: Transformation emotionnelle (avant/apres). Histoire vraie d'identification. Prise de conscience + etape concrete a realiser aujourd'hui.";
        else if (category.includes("ant") || category.includes("Bien"))
          categoryGuide = "\n\nGUIDE SANTE: Conseils pratiques fondes sur des faits. Vulgarise la science. Protocole ou habitude applicable immediatement.";
        else if (category.includes("piritual"))
          categoryGuide = "\n\nGUIDE SPIRITUALITE: Profondeur existentielle, symboles et metaphores puissants. Question ou pratique meditative en cloture.";
        else if (category.includes("inance") || category.includes("nvestiss"))
          categoryGuide = "\n\nGUIDE FINANCE: Concret et chiffre. Calculs reels, exemples pratiques, erreurs courantes a eviter. Strategie reproductible etape par etape.";
        else if (category.includes("uisine"))
          categoryGuide = "\n\nGUIDE CUISINE: Recette ou technique avec etapes precises et temps. Ingredients accessibles localement. Astuces de chef, variantes possibles. Niveau de difficulte clairement indique.";
        else if (category.includes("echnolog"))
          categoryGuide = "\n\nGUIDE TECHNOLOGIE: Concept explique avec analogie simple. Exemple concret ou cas d'usage reel. Code snippet si pertinent. Vulgarise sans simplifier a l'exces.";
        else if (category.includes("veloppement") && category.includes("nfant"))
          categoryGuide = "\n\nGUIDE DEVELOPPEMENT ENFANTS: Stade de developpement concerne clairement identifie. Conseils pratiques et bienveillants pour les parents. Activite ou exercice parent-enfant applicable immediatement.";
      }
      if (categoryFocus) categoryGuide += `\n\nFOCUS SPECIFIQUE: ${categoryFocus}`;
      const chapterPrompt = basePrompt + (themeContext ? `\n\n${themeContext}` : "") + categoryGuide + noMarkdownReminder;

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: chapterPrompt },
        ],
        temperature: 0.88, max_tokens: 2048,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }

    // â”€â”€ REGENERATE SINGLE CHAPTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "regenerate") {
      const { title, chapterTitle, chapterIndex, totalChapters, category, style, instruction,
              description, themes, savedStyleDescription, allChapterTitles,
              prevChapterContent, nextChapterContent, novelBible, novelGenre } = body;

      const isPoem = category?.includes("Poési");
      const isNovel = category?.includes("Roman");

      // Build continuity context
      const contextBlock = [
        allChapterTitles?.length
          ? `PLAN COMPLET:\n${(allChapterTitles as string[]).map((t: string, i: number) => `${i + 1}. ${t}${i + 1 === chapterIndex ? " ← (chapitre à réécrire)" : ""}`).join("\n")}`
          : "",
        prevChapterContent
          ? `FIN DU CHAPITRE PRÉCÉDENT (assurer la continuité):\n"...${prevChapterContent}"`
          : "",
        nextChapterContent
          ? `DÉBUT DU CHAPITRE SUIVANT (préparer la transition):\n"${nextChapterContent}..."`
          : "",
        description || themes ? `THÈME ET CONTEXTE DU LIVRE: ${description || themes}` : "",
        savedStyleDescription ? `STYLE PERSONNEL DE L'AUTEUR (reproduire fidèlement):\n${savedStyleDescription}` : "",
      ].filter(Boolean).join("\n\n");

      // Category-specific guide synchronized with chapter action
      const { categoryFocus: regenCatFocus } = body;
      let regenCategoryGuide = "";
      if (category) {
        if (category.includes("Business") || category.includes("Entrepren"))
          regenCategoryGuide = "\n\nGUIDE BUSINESS: Strategie actionnable, exemples reels d'entrepreneurs, recapitulatif de l'action cle.";
        else if (category.includes("veloppement") && !category.includes("nfant"))
          regenCategoryGuide = "\n\nGUIDE DEVELOPPEMENT PERSONNEL: Transformation (avant/apres). Histoire vraie d'identification. Prise de conscience + etape concrete.";
        else if ((category.includes("ant") || category.includes("Bien")) && !category.includes("nfant"))
          regenCategoryGuide = "\n\nGUIDE SANTE: Conseils pratiques fondes sur des faits. Protocole ou habitude applicable immediatement.";
        else if (category.includes("piritual"))
          regenCategoryGuide = "\n\nGUIDE SPIRITUALITE: Profondeur existentielle, symboles puissants. Question ou pratique meditative en cloture.";
        else if (category.includes("inance") || category.includes("nvestiss"))
          regenCategoryGuide = "\n\nGUIDE FINANCE: Concret et chiffre. Calculs simples, strategie reproductible etape par etape.";
        else if (category.includes("uisine"))
          regenCategoryGuide = "\n\nGUIDE CUISINE: Recette ou technique avec etapes precises. Astuces de chef, ingredients accessibles.";
        else if (category.includes("echnolog"))
          regenCategoryGuide = "\n\nGUIDE TECHNOLOGIE: Concept clair avec analogie. Exemple concret ou cas d'usage reel.";
        else if (category.includes("veloppement") && category.includes("nfant"))
          regenCategoryGuide = "\n\nGUIDE DEVELOPPEMENT ENFANTS: Stade de developpement. Activite parent-enfant pratique.";
      }
      if (regenCatFocus) regenCategoryGuide += `\n\nFOCUS SPECIFIQUE: ${regenCatFocus}`;

      if (isNovel && novelBible) {
        const novelStyleMap: Record<string, string> = {
          "Immersif & sensoriel": "richesse sensorielle totale — ce que les persos voient, sentent, entendent",
          "Psychologique": "profondeur psychologique, monologue intérieur, pensées contradictoires",
          "Cinématographique": "coupes nettes, dialogues percutants, dynamique visuelle",
          "Poétique": "prose poétique, images métaphoriques, langue musicale",
          "Haletant & tendu": "rythme effréné, phrases courtes, révélations successives",
        };
        const styleDesc = novelStyleMap[style || ""] || "style littéraire immersif et naturel";
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu es un romancier de niveau international. Tu réécris des chapitres en préservant la cohérence narrative totale. Prose littéraire pure, jamais de markdown." },
            { role: "user", content: `Réécris le chapitre ${chapterIndex}/${totalChapters} "${chapterTitle}" du roman "${title}" (genre: ${novelGenre || "Drame"}).
${instruction ? `INSTRUCTION SPÉCIFIQUE: ${instruction}` : "Réécris avec un angle narratif différent — nouvelle entrée en scène, nouvelle tension, perspective différente."}

BIBLE DES PERSONNAGES ET STRUCTURE:
${novelBible}

${contextBlock}

STYLE: ${styleDesc}

RÈGLES ABSOLUES:
- Prose littéraire pure, rythme adapté à la scène
- CRUCIAL: Angle narratif RADICALEMENT DIFFÉRENT de toute version précédente — nouvelle scène d'ouverture inédite, point de vue décalé, tension ou révélation différente. Le lecteur doit avoir l'impression de lire un chapitre entièrement nouveau.
- Mêmes personnages, même cohérence, continuité respectée
- Dialogue naturel révélateur de caractère + monologue intérieur
- Zéro markdown, zéro titre, zéro liste, zéro astérisque` },
          ],
          temperature: 0.9, max_tokens: 3500,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      if (isPoem) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_AUTHOR },
            { role: "user", content: `Réécris le poème "${chapterTitle}" du recueil "${title}" avec une approche totalement différente. ${instruction || "Version plus émotionnelle et imagée."} Court et dense — sans longueur imposée, juste ce que l'émotion demande. Aucun astérisque ni tiret.` },
          ],
          temperature: 0.92, max_tokens: 800,
        });
        return NextResponse.json({ content: completion.choices[0].message.content || "" });
      }

      const styleNote = style ? `Style imposé: ${style}. ` : "";
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `Réécris le chapitre "${chapterTitle}" (${chapterIndex}/${totalChapters}) du livre "${title}" avec un angle entièrement nouveau.
${instruction ? `Instruction spécifique: ${instruction}` : "Nouveaux exemples, nouvelle entrée en matière, perspective différente."}
${styleNote}
${contextBlock ? `\n${contextBlock}` : ""}

Prose fluide et naturelle. Respecte la continuité avec les chapitres adjacents.
CRUCIAL: Cette version doit être RADICALEMENT DIFFÉRENTE — nouvelle accroche, nouveaux exemples concrets, angle d'attaque inédit, histoire d'ouverture différente. Le lecteur ne doit jamais avoir l'impression de relire la même chose.
Aucun astérisque, aucun sous-titre, aucune liste.${regenCategoryGuide ? `\n\n${regenCategoryGuide}` : ""}` },
        ],
        temperature: 0.88, max_tokens: 2800,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }


    // â”€â”€ IMPROVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "improve") {
      const { text } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur littÃ©raire professionnel. AmÃ©liore le texte: fluiditÃ©, impact, vocabulaire, rythme. Garde le sens et la longueur approximative. Supprime tous les astÃ©risques, tirets de liste et marqueurs markdown. Retourne UNIQUEMENT le texte amÃ©liorÃ© en prose continue." },
          { role: "user", content: text },
        ],
        temperature: 0.6, max_tokens: 4096,
      });
      return NextResponse.json({ improved: completion.choices[0].message.content || text });
    }

    // â”€â”€ DESCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "description") {
      const { title, category, chaptersPreview } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en marketing Ã©ditorial. Tu Ã©cris des descriptions qui font exploser les ventes." },
          { role: "user", content: `3 descriptions pour: "${title}" (${category || "Non-fiction"})
Chapitres: ${chaptersPreview || ""}

--- COURTE ---
[50 mots max â€” rÃ©sultats de recherche]

--- MEDIUM ---
[120 mots â€” page produit principale]

--- LONGUE ---
[250 mots â€” accroche Ã©motionnelle + promesse + contenu + appel Ã  l'action]` },
        ],
        temperature: 0.8, max_tokens: 2048,
      });
      return NextResponse.json({ description: completion.choices[0].message.content || "" });
    }

    // â”€â”€ QUOTES EXTRACTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "quotes") {
      const { title, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en extraction de citations percutantes pour les rÃ©seaux sociaux." },
          { role: "user", content: `Extrait les 10 meilleures citations/phrases du livre "${title}".
CritÃ¨res: courtes (max 2 lignes), percutantes, partageables sur Instagram/Facebook.
Format: une citation par ligne, prÃ©cÃ©dÃ©e d'un numÃ©ro. Pas de guillemets superflus.

Contenu du livre:
${content.substring(0, 6000)}` },
        ],
        temperature: 0.5, max_tokens: 1024,
      });
      return NextResponse.json({ quotes: completion.choices[0].message.content || "" });
    }

    // â”€â”€ SOCIAL MEDIA POSTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "social") {
      const { title, description, category, platform, tone } = body;
      const prompts: Record<string, string> = {
        instagram: `CrÃ©e 3 posts Instagram pour le livre "${title}" (${category}).
Description: ${description}
Chaque post: accroche forte + contenu engageant + appel Ã  l'action + 15-20 hashtags pertinents.
Ton: ${tone || "inspirant"}. Emojis inclus. SÃ©pare chaque post par ---`,
        facebook: `CrÃ©e 3 posts Facebook longs (300-500 mots) pour promouvoir le livre "${title}".
Description: ${description}
Style: storytelling + valeur ajoutÃ©e + curiositÃ© + appel Ã  acheter. Ton: ${tone || "authentique"}.
SÃ©pare chaque post par ---`,
        twitter: `CrÃ©e un thread Twitter de 10 tweets sur le thÃ¨me du livre "${title}".
Description: ${description}
Tweet 1: accroche virale. Tweets 2-9: conseils/idÃ©es de valeur. Tweet 10: CTA.
NumÃ©roter 1/ 2/ etc. Ton: ${tone || "direct et percutant"}.`,
        tiktok: `CrÃ©e 5 scripts courts TikTok/Reels (30-45 secondes) pour le livre "${title}".
Chaque script: accroche choc (3 sec) + dÃ©veloppement rapide + CTA final.
Format: ACCROCHE: ... | CONTENU: ... | CTA: ...
Ton: ${tone || "dynamique et authentique"}.`,
        linkedin: `CrÃ©e 2 posts LinkedIn professionnels pour le livre "${title}" (${category}).
Description: ${description}
Style: expertise + insights + valeur business + networking. 400-600 mots. Ton: ${tone || "professionnel"}.
SÃ©pare par ---`,
      };
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en marketing digital et copywriting pour les rÃ©seaux sociaux. Tu crÃ©es du contenu viral en franÃ§ais." },
          { role: "user", content: prompts[platform] || prompts.instagram },
        ],
        temperature: 0.85, max_tokens: 3000,
      });
      return NextResponse.json({ posts: completion.choices[0].message.content || "" });
    }

    // â”€â”€ EMAIL MARKETING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "email") {
      const { title, description, type, authorName } = body;
      const types: Record<string, string> = {
        launch: `Ã‰cris un email de lancement pour le livre "${title}" signÃ© par ${authorName || "l'auteur"}.
Description: ${description}
Structure: objet accrocheur + histoire personnelle + valeur du livre + offre spÃ©ciale lancement + CTA urgent.
Longueur: 400-600 mots. Format: OBJET: [objet] | [corps de l'email]`,
        followup: `Ã‰cris une sÃ©quence de 5 emails de suivi pour vendre "${title}".
Email 1 (J+0): bienvenue + cadeau (chapitre gratuit)
Email 2 (J+2): valeur + conseil du livre
Email 3 (J+4): tÃ©moignage/rÃ©sultat + offre
Email 4 (J+6): lever une objection + garantie
Email 5 (J+8): derniÃ¨re chance + urgence
Chaque email: OBJET: + CORPS: (200-300 mots). SÃ©pare par ---`,
        review: `Ã‰cris un email pour demander un avis/tÃ©moignage sur le livre "${title}" Ã  un lecteur.
Ton: chaleureux, non intrusif, reconnaissant. 150-200 mots.
Format: OBJET: [objet] | [corps]`,
        podcast: `Ã‰cris un email de pitch pour devenir invitÃ© dans un podcast en parlant du livre "${title}".
Description: ${description}
Ton: professionnel, confiant, valeur pour l'audience. 200-250 mots.
Format: OBJET: [objet] | [corps]`,
      };
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en email marketing et copywriting. Tu crÃ©es des emails qui convertissent en franÃ§ais." },
          { role: "user", content: types[type] || types.launch },
        ],
        temperature: 0.8, max_tokens: 3000,
      });
      return NextResponse.json({ email: completion.choices[0].message.content || "" });
    }

    // â”€â”€ SEO KEYWORDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "seo") {
      const { title, category, description } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un expert en SEO pour Amazon KDP et Kobo. Tu connais les algorithmes de recherche des librairies en ligne." },
          { role: "user", content: `Optimisation SEO pour le livre: "${title}" (${category}).
Description: ${description || ""}

Fournis:
1. 7 MOTS-CLÃ‰S AMAZON (un par ligne, du plus au moins important â€” max 50 caractÃ¨res chacun)
2. 2 CATÃ‰GORIES AMAZON recommandÃ©es (chemin complet)
3. TITRE OPTIMISÃ‰ (avec sous-titre SEO si pertinent)
4. 5 MOTS-CLÃ‰S KOBO
5. SCORE DE COMPÃ‰TITION estimÃ© (1-10) avec explication` },
        ],
        temperature: 0.5, max_tokens: 1024,
      });
      return NextResponse.json({ seo: completion.choices[0].message.content || "" });
    }

    // â”€â”€ AUTHOR BIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "bio") {
      const { authorName, expertise, books } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu Ã©cris des biographies d'auteurs professionnelles et engageantes en franÃ§ais." },
          { role: "user", content: `Ã‰cris 3 biographies pour l'auteur: ${authorName}
Expertise/domaine: ${expertise || "auteur indÃ©pendant"}
Livres: ${books || "auteur"}

--- COURTE (50 mots) --- pour Amazon KDP
--- MEDIUM (120 mots) --- pour les plateformes
--- LONGUE (250 mots) --- pour le site web et presse` },
        ],
        temperature: 0.75, max_tokens: 1500,
      });
      return NextResponse.json({ bio: completion.choices[0].message.content || "" });
    }

    // â”€â”€ FAQ GENERATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "faq") {
      const { title, category, description } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en crÃ©ation de contenu FAQ pour les livres et la vente en ligne." },
          { role: "user", content: `GÃ©nÃ¨re une FAQ de 10 questions-rÃ©ponses pour le livre "${title}" (${category}).
Description: ${description || ""}
Questions que se posent les acheteurs potentiels. RÃ©ponses: 2-4 phrases, rassurantes et vendeuses.
Format: **Q: [question]** | R: [rÃ©ponse]` },
        ],
        temperature: 0.7, max_tokens: 2000,
      });
      return NextResponse.json({ faq: completion.choices[0].message.content || "" });
    }

    // â”€â”€ READING ANALYSIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "analyze") {
      const { content, title } = body;
      const wordCount = content.split(/\s+/).length;
      const readingMinutes = Math.round(wordCount / 200);
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse littÃ©raire et Ã©ditoriale." },
          { role: "user", content: `Analyse ce livre "${title}" sur les critÃ¨res suivants:
1. NIVEAU DE LECTURE (DÃ©butant/IntermÃ©diaire/Expert)
2. TON DOMINANT (liste 3 adjectifs)
3. POINTS FORTS (3 points)
4. AXES D'AMÃ‰LIORATION (3 suggestions)
5. SCORE COMMERCIAL /10 avec justification
6. PUBLIC CIBLE idÃ©al (2-3 phrases)

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

    // â”€â”€ CONTENT CALENDAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "calendar") {
      const { title, launchDate, platforms } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en stratÃ©gie de lancement de livres et marketing de contenu." },
          { role: "user", content: `CrÃ©e un calendrier de contenu 30 jours pour le lancement du livre "${title}".
Date de lancement: ${launchDate || "dans 2 semaines"}
Plateformes: ${platforms || "Instagram, Facebook, TikTok"}

J-14 au J0: prÃ©-lancement (teasing, extraits, coulisses)
J0: lancement (annonces, posts de lancement)
J+1 Ã  J+14: post-lancement (tÃ©moignages, FAQ, contenus de valeur)

Format tableau: JOUR | PLATEFORME | TYPE DE CONTENU | IDÃ‰E PRINCIPALE` },
        ],
        temperature: 0.7, max_tokens: 2000,
      });
      return NextResponse.json({ calendar: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ NICHE RESEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "niche") {
      const { niche, category } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse de marchÃ© Ã©ditorial numÃ©rique et en publishing indÃ©pendant." },
          { role: "user", content: `Analyse le potentiel commercial de cette niche pour l'Ã©dition numÃ©rique:
Niche: "${niche}" | CatÃ©gorie: ${category || "Non-fiction"}

Analyse:
1. TAILLE DU MARCHÃ‰ (estimation)
2. NIVEAU DE COMPÃ‰TITION (Faible/Moyen/Fort + explication)
3. ACHETEURS TYPES (2-3 profils dÃ©taillÃ©s)
4. PRIX OPTIMAL recommandÃ©
5. 5 ANGLES D'ATTAQUE originaux pour se dÃ©marquer
6. 3 TITRES ACCROCHEURS suggÃ©rÃ©s
7. POTENTIEL REVENU estimÃ© (1Ã¨re annÃ©e)
8. SCORE OPPORTUNITÃ‰ /10` },
        ],
        temperature: 0.7, max_tokens: 1500,
      });
      return NextResponse.json({ niche: completion.choices[0].message.content || "" });
    }

    // â”€â”€ SERIES PLANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "series") {
      const { title, category, nbBooks } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en crÃ©ation de sÃ©ries de livres et en stratÃ©gie Ã©ditoriale." },
          { role: "user", content: `CrÃ©e un plan de sÃ©rie de ${nbBooks || 3} livres autour du thÃ¨me: "${title}" (${category || "Non-fiction"}).

Pour chaque tome:
- TITRE accrocheur
- SOUS-TITRE
- THÃˆME CENTRAL
- 5 CHAPITRES CLÃ‰S
- LIEN avec les autres tomes
- ORDRE DE LECTURE recommandÃ©

La sÃ©rie doit crÃ©er une progression logique et donner envie de lire le suivant.` },
        ],
        temperature: 0.8, max_tokens: 2000,
      });
      return NextResponse.json({ series: completion.choices[0].message.content || "" });
    }

    // â”€â”€ CHAPTER SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "summary") {
      const { chapterTitle, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu rÃ©sumes des chapitres de livres en 3-4 phrases claires et percutantes." },
          { role: "user", content: `RÃ©sume ce chapitre "${chapterTitle}" en 3-4 phrases clÃ©s. Points essentiels Ã  retenir:\n\n${content.substring(0, 3000)}` },
        ],
        temperature: 0.4, max_tokens: 300,
      });
      return NextResponse.json({ summary: completion.choices[0].message.content || "" });
    }

    // ── PODCAST EPISODE (plan + script lisible) ──────────────────────────────
    if (action === "podcast") {
      const { chapterTitle, content, bookTitle, chapterIndex, chapters: allChapters, mode: podMode } = body as {
        chapterTitle?: string; content?: string; bookTitle?: string; chapterIndex?: number;
        chapters?: { title: string; content: string }[]; mode?: "chapter" | "full";
      };

      const isFullBook = podMode === "full" && allChapters && allChapters.length > 0;
      const bookContent = isFullBook
        ? allChapters!.map((c: {title:string;content:string}, i: number) => `Chapitre ${i + 1} — ${c.title}:\n${(c.content || "").substring(0, 800)}`).join("\n\n")
        : (content || "").substring(0, 3000);
      const episodeTitle = isFullBook ? `Livre complet — ${bookTitle}` : `Chapitre ${chapterIndex} — ${chapterTitle}`;
      const durationWords = isFullBook ? "12-18 minutes (~1800-2700 mots)" : "6-10 minutes (~900-1500 mots)";

      const [planRes, scriptRes] = await Promise.all([
        groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu es un expert en podcasting francophone. Tu crées des plans d'épisodes engageants pour livres francophones et africains." },
            { role: "user", content: `Crée le PLAN DÉTAILLÉ d'un épisode podcast: "${episodeTitle}" du livre "${bookTitle}".

Contenu:
${bookContent}

Structure requise:
## 🎙️ TITRE ÉPISODE
## ⏱️ DURÉE ESTIMÉE
## 🪝 ACCROCHE (0-30s)
## 📋 INTRO (30s-2min)
## 🔑 POINTS CLÉS (3-5)
## 💡 HISTOIRE/EXEMPLE
## 🎯 OUTRO + CTA
## 📝 NOTES PRÉPARATION` },
          ],
          temperature: 0.8, max_tokens: 1500,
        }),
        groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Tu es un auteur de scripts podcasts professionnels en français. Tu écris exactement ce que l'animateur dit mot pour mot, de façon naturelle et orale. Pas de markdown — texte naturel à lire à voix haute." },
            { role: "user", content: `Écris le SCRIPT COMPLET mot-pour-mot d'un épisode podcast sur: "${episodeTitle}" du livre "${bookTitle}".

Contenu source:
${bookContent}

Règle: écris EXACTEMENT ce que l'animateur dit, naturellement. Commence par une accroche directe. Utilise [PAUSE] et [EMPHASE] pour le rythme. Durée cible: ${durationWords}. Termine par un CTA pour le livre. Commence maintenant:` },
          ],
          temperature: 0.85, max_tokens: 2500,
        }),
      ]);

      return NextResponse.json({
        podcast: planRes.choices[0].message.content || "",
        script: scriptRes.choices[0].message.content || "",
        episodeTitle,
      });
    }


    // â”€â”€ CONTINUE WRITING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "continue") {
      const { bookTitle, chapterTitle, existingContent, instruction, style, language } = body;
      const langNote = language && language !== "FranÃ§ais" ? `Ã‰cris en ${language}.` : "";
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `Continue ce chapitre "${chapterTitle}" du livre "${bookTitle}".
${langNote}
Instruction: ${instruction || "Continue naturellement dans le mÃªme style et ton."}
Style: ${style || "Motivant"}

Texte existant (continue directement aprÃ¨s):
${existingContent}

Ã‰cris 200 Ã  400 mots supplÃ©mentaires qui s'enchaÃ®nent parfaitement. Aucun astÃ©risque, aucun tiret, prose continue.` },
        ],
        temperature: 0.85, max_tokens: 1024,
      });
      return NextResponse.json({ continuation: completion.choices[0].message.content || "" });
    }

    // â”€â”€ AI DIALOGUE / PARAGRAPH REFINEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "dialogue") {
      const { bookTitle, paragraph, instruction } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur littÃ©raire expert. Tu reformules, amÃ©liores ou rÃ©Ã©cris des paragraphes prÃ©cis selon les instructions de l'auteur. Tu retournes UNIQUEMENT le nouveau texte, sans explication." },
          { role: "user", content: `Livre: "${bookTitle}"
Instruction: ${instruction}

Paragraphe Ã  modifier:
${paragraph}

Retourne uniquement le paragraphe rÃ©Ã©crit, sans commentaire ni explication.` },
        ],
        temperature: 0.8, max_tokens: 1024,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ BOOKTOK SCRIPT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "booktok") {
      const { bookTitle, category, description, angle } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en crÃ©ation de contenu viral TikTok/Reels pour les livres (BookTok). Tu crÃ©es des scripts courts, dynamiques et qui donnent envie de lire." },
          { role: "user", content: `CrÃ©e 3 scripts BookTok de 30-45 secondes pour le livre "${bookTitle}" (${category || ""}).
Description: ${description || ""}
Angle privilÃ©giÃ©: ${angle || "curiositÃ© + valeur + shock value"}

Pour chaque script:
TITRE DU SCRIPT: [titre]
DURÃ‰E: [X secondes]
ACCROCHE (0-3s): [phrase choc, question, stat ou rÃ©vÃ©lation]
DÃ‰VELOPPEMENT (3-25s): [contenu parlÃ©, dynamique, avec sous-titres suggÃ©rÃ©s]
RÃ‰VÃ‰LATION/CLIMAX (25-35s): [la punchline ou la valeur clÃ©]
CTA (35-45s): [appel Ã  l'action naturel]
TEXTE Ã€ L'Ã‰CRAN: [bullets Ã  afficher]
HASHTAGS: [10 hashtags]
---` },
        ],
        temperature: 0.9, max_tokens: 2000,
      });
      return NextResponse.json({ booktok: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ NEWSLETTER CHAPTER DRAFT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "newsletter") {
      const { bookTitle, chapterTitle, chapterContent, authorName, subscriberCount } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu Ã©cris des newsletters d'auteurs qui crÃ©ent de l'anticipation et fidÃ©lisent les lecteurs." },
          { role: "user", content: `Ã‰cris une newsletter d'auteur pour annoncer le chapitre "${chapterTitle}" du livre "${bookTitle}".
Auteur: ${authorName || "l'auteur"}
AbonnÃ©s: ${subscriberCount || "tes lecteurs"}

Extrait du chapitre:
${(chapterContent || "").substring(0, 1000)}

Structure:
OBJET DE L'EMAIL: [objet qui donne envie d'ouvrir]
PRÃ‰-HEADER: [texte de prÃ©visualisation]

[Corps â€” 300-400 mots]
- Accroche personnelle et sincÃ¨re (coulisses de l'Ã©criture)
- Extrait exclusif du chapitre (150 mots max)
- Ce que le lecteur va dÃ©couvrir dans ce chapitre
- Tease du prochain chapitre
- Signature personnelle de l'auteur` },
        ],
        temperature: 0.82, max_tokens: 1500,
      });
      return NextResponse.json({ newsletter: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ CONSISTENCY CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "consistency") {
      const { bookTitle, chapters } = body;
      const chapterSummaries = (chapters as { title: string; content: string }[])
        .map((c, i) => `Ch.${i + 1} "${c.title}": ${c.content.substring(0, 300)}`)
        .join("\n\n");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur professionnel spÃ©cialisÃ© dans la cohÃ©rence et la continuitÃ© des manuscrits." },
          { role: "user", content: `VÃ©rifie la cohÃ©rence globale du livre "${bookTitle}".

RÃ©sumÃ©s de chapitres:
${chapterSummaries}

Analyse et identifie:
1. INCOHÃ‰RENCES DÃ‰TECTÃ‰ES (contradictions, rÃ©pÃ©titions de concepts, changements de ton)
2. PROGRESSION NARRATIVE (est-ce que les chapitres s'enchaÃ®nent logiquement ?)
3. TON ET STYLE (est-il cohÃ©rent tout au long du livre ?)
4. CONCEPTS RÃ‰PÃ‰TÃ‰S (idÃ©es qui reviennent trop souvent)
5. CHAPITRES FAIBLES (ceux qui semblent hors-sujet ou sous-dÃ©veloppÃ©s)
6. SUGGESTIONS D'AMÃ‰LIORATION (3-5 recommandations concrÃ¨tes)
7. SCORE DE COHÃ‰RENCE /10` },
        ],
        temperature: 0.5, max_tokens: 1500,
      });
      return NextResponse.json({ consistency: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ DUPLICATE DETECTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "duplicates") {
      const { bookTitle, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur qui dÃ©tecte les rÃ©pÃ©titions et redondances dans les manuscrits." },
          { role: "user", content: `Analyse ce texte du livre "${bookTitle}" pour identifier:
1. MOTS/EXPRESSIONS SURUTILISÃ‰S (avec frÃ©quence estimÃ©e et alternatives suggÃ©rÃ©es)
2. IDÃ‰ES RÃ‰PÃ‰TÃ‰ES (concepts exprimÃ©s plusieurs fois identiquement)
3. STRUCTURES DE PHRASES REDONDANTES (patterns qui reviennent)
4. SCORE DE VARIÃ‰TÃ‰ LEXICALE /10
5. TOP 5 SUGGESTIONS pour enrichir le vocabulaire

Texte (premiers 4000 mots):
${(content || "").substring(0, 4000)}` },
        ],
        temperature: 0.4, max_tokens: 1200,
      });
      return NextResponse.json({ duplicates: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ REVIEW REQUEST DM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "review_request") {
      const { bookTitle, authorName, platform } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu Ã©cris des messages de demande d'avis chaleureux et non intrusifs pour les auteurs indÃ©pendants." },
          { role: "user", content: `CrÃ©e 3 variantes de messages de demande d'avis pour le livre "${bookTitle}" de ${authorName || "l'auteur"}.
Plateforme cible: ${platform || "Amazon / Kobo / tous"}

Variante 1: Message court (DM Instagram/Facebook â€” 50 mots)
Variante 2: Email personnel (150 mots)
Variante 3: Message post-achat automatique (100 mots)

Chaque message doit Ãªtre:
- Chaleureux et sincÃ¨re, pas spam
- Reconnaissant envers le lecteur
- PrÃ©cis sur COMMENT et OÃ™ laisser un avis
- Avec une touche personnelle
SÃ©pare par ---` },
        ],
        temperature: 0.75, max_tokens: 1200,
      });
      return NextResponse.json({ messages: completion.choices[0].message.content || "" });
    }

    // â”€â”€ PROMO CALENDAR (30 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "promo_calendar") {
      const { bookTitle, launchDate, authorName, platforms } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en stratÃ©gie de lancement de livres numÃ©riques et en marketing de contenu." },
          { role: "user", content: `CrÃ©e un calendrier de promotion 30 jours dÃ©taillÃ© pour "${bookTitle}" de ${authorName || "l'auteur"}.
Date de lancement: ${launchDate || "J+14"}
Plateformes: ${platforms || "Instagram, Facebook, TikTok"}

Phases:
- J-14 Ã  J-1: PrÃ©-lancement (teasing, extraits, behind-the-scenes)
- J0: Lancement officiel
- J+1 Ã  J+7: Momentum post-lancement
- J+8 Ã  J+14: Maintien + tÃ©moignages
- J+15 Ã  J+30: StratÃ©gie long terme

Pour chaque jour fournis:
JOUR | DATE | PLATEFORME | TYPE | IDÃ‰E DE CONTENU | HOOK/ACCROCHE
Format tableau, 30 lignes.` },
        ],
        temperature: 0.75, max_tokens: 3000,
      });
      return NextResponse.json({ calendar: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ AUTO CHECKLIST VERIFICATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "checklist_auto") {
      const { bookTitle, category, chaptersContent, items } = body;
      const text = (chaptersContent as string).substring(0, 8000);
      const itemList = (items as { id: string; label: string; desc: string }[])
        .map(i => `${i.id}: ${i.label} â€” ${i.desc}`).join("\n");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur professionnel qui vÃ©rifie la qualitÃ© des livres numÃ©riques. Tu analyses le contenu et renvoies UNIQUEMENT un JSON valide, sans markdown." },
          { role: "user", content: `Analyse ce livre et vÃ©rifie chaque point de la checklist.

LIVRE: "${bookTitle}" (${category})
CONTENU (extrait):
${text}

POINTS Ã€ VÃ‰RIFIER:
${itemList}

Pour chaque point, dis si c'est PASS ou FAIL avec une note courte (max 80 chars) expliquant POURQUOI.
Si FAIL, dis comment corriger en 1 phrase courte.

RÃ©ponds UNIQUEMENT avec ce JSON:
{
  "results": [
    { "id": "c1", "pass": true, "note": "raison courte" },
    { "id": "c2", "pass": false, "note": "problÃ¨me dÃ©tectÃ©", "fix": "comment corriger" }
  ]
}` },
        ],
        temperature: 0.3, max_tokens: 2000,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    // â”€â”€ GENRE COMPLIANCE CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "genre_check") {
      const { bookTitle, category, chaptersContent } = body;
      const text = (chaptersContent as string).substring(0, 8000);
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur expert en conformitÃ© de livres par genre. Tu analyses si un livre contient tous les Ã©lÃ©ments attendus de son genre. Tu rÃ©ponds UNIQUEMENT en JSON valide sans markdown." },
          { role: "user", content: `Analyse si ce livre correspond bien Ã  son genre et contient tous les Ã©lÃ©ments attendus.

LIVRE: "${bookTitle}"
GENRE/CATÃ‰GORIE: ${category}
CONTENU (extrait):
${text}

Identifie les Ã©lÃ©ments OBLIGATOIRES et RECOMMANDÃ‰S pour ce genre.
Pour chaque Ã©lÃ©ment, dis s'il est PRÃ‰SENT ou ABSENT dans le livre.
Si absent, dis COMMENT l'ajouter concrÃ¨tement.

RÃ©ponds UNIQUEMENT avec ce JSON:
{
  "genre": "${category}",
  "score": 75,
  "verdict": "Bon livre mais manque d'exercices pratiques",
  "elements": [
    {
      "name": "Nom de l'Ã©lÃ©ment",
      "importance": "obligatoire",
      "present": true,
      "note": "Bien prÃ©sent dans les chapitres 2 et 4",
      "fix": null
    },
    {
      "name": "Exercices pratiques",
      "importance": "obligatoire",
      "present": false,
      "note": "Aucun exercice ou activitÃ© pour le lecteur",
      "fix": "Ajoute 1-2 exercices Ã  la fin de chaque chapitre: questions de rÃ©flexion, mise en action concrÃ¨te, journal de bord"
    }
  ]
}` },
        ],
        temperature: 0.3, max_tokens: 3000,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    // â”€â”€ LANDING PAGE COPY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "landing") {
      const { bookTitle, authorName, description, category, price } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en copywriting de pages de vente pour livres numÃ©riques." },
          { role: "user", content: `Ã‰cris le contenu complet d'une page de vente pour le livre "${bookTitle}" par ${authorName || "l'auteur"}.
CatÃ©gorie: ${category || "Non-fiction"}
Description: ${description || ""}
Prix: ${price || "9,99â‚¬"}

Structure:
TITRE PRINCIPAL (H1): [accroche puissante]
SOUS-TITRE: [promesse de rÃ©sultat]
HERO TEXT: [2-3 phrases d'impact]
PROBLÃˆME: [douleur du lecteur, 100 mots]
PROMESSE: [ce que le livre va changer, 100 mots]
CE QUE TU VAS APPRENDRE: [6-8 bullet points]
POUR QUI: [profil idÃ©al du lecteur, 80 mots]
Ã€ PROPOS DE L'AUTEUR: [bio courte, 80 mots]
TÃ‰MOIGNAGES: [3 avis fictifs rÃ©alistes Ã  remplacer]
PRIX + CTA: [argument de valeur + bouton d'achat]
FAQ: [5 questions/rÃ©ponses courtes]
GARANTIE: [texte de garantie 30 jours]` },
        ],
        temperature: 0.82, max_tokens: 3000,
      });
      return NextResponse.json({ landing: completion.choices[0].message.content || "" });
    }

    // â”€â”€ BUNDLE DESCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "bundle_desc") {
      const { books, bundleTitle } = body;
      const bookList = (books as string[]).join(", ");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crÃ©es des descriptions percutantes pour des bundles de livres numÃ©riques." },
          { role: "user", content: `CrÃ©e une description de vente pour ce bundle: "${bundleTitle}"
Livres inclus: ${bookList}

Fournis:
TITRE DU BUNDLE: [titre vendeur]
SOUS-TITRE: [promesse + valeur]
DESCRIPTION COURTE (100 mots): pour les places de marchÃ©
DESCRIPTION LONGUE (300 mots): page de vente complÃ¨te
CE QUI EST INCLUS: [liste des livres avec 1 phrase chacun]
VALEUR TOTALE: [argument de prix]
POUR QUI: [profil lecteur idÃ©al]` },
        ],
        temperature: 0.8, max_tokens: 1500,
      });
      return NextResponse.json({ description: completion.choices[0].message.content || "" });
    }

    // â”€â”€ GHOST BOOK (single chapter, called per chapter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "ghost_book") {
      const { title, category, description, style, chapterTitle, chapterIndex, totalChapters } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `Ã‰cris le chapitre ${chapterIndex + 1}/${totalChapters} intitulÃ© "${chapterTitle}" du livre "${title}" (${category || "Non-fiction"}).
Description du livre: ${description || ""}
Style: ${style || "Motivant et direct"}
Objectif: 400-600 mots. Prose continue, pas d'astÃ©risques ni de tirets.` },
        ],
        temperature: 0.85, max_tokens: 1200,
      });
      return NextResponse.json({ content: completion.choices[0].message.content || "" });
    }

    // â”€â”€ TONE CLONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "tone_clone") {
      const { sampleText, bookTitle, chapterTitle, instruction } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse stylistique et mimÃ©tisme littÃ©raire. Tu extrais l'ADN d'un style et l'appliques Ã  de nouveaux textes." },
          { role: "user", content: `Analyse ce texte et extrais son style unique:

TEXTE D'EXEMPLE:
${(sampleText as string).substring(0, 2000)}

Puis Ã©cris un nouveau contenu sur "${chapterTitle || instruction || "ce sujet"}" pour le livre "${bookTitle || "ce livre"}" en imitant EXACTEMENT ce style.

FORMAT DE RÃ‰PONSE:
STYLE DÃ‰TECTÃ‰:
[5 caractÃ©ristiques du style]

TEXTE GÃ‰NÃ‰RÃ‰:
[300-400 mots dans ce style]` },
        ],
        temperature: 0.8, max_tokens: 1500,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ EMOTIONAL ARC ANALYZER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "emotional_arc") {
      const { bookTitle, chapters } = body;
      const chapterList = (chapters as { title: string; content: string }[])
        .map((c, i) => `CH${i + 1}: "${c.title}" — ${(c.content || "").substring(0, 250)}`).join('\n');

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Tu es analyste litteraire expert en psychologie du lecteur, en dramaturgie et en structure narrative. Tu reponds UNIQUEMENT en JSON valide, sans texte autour.",
          },
          {
            role: "user",
            content: `Analyse complete de l'arc emotionnel du livre "${bookTitle}".

Chapitres:
${chapterList}

Reponds UNIQUEMENT avec ce JSON (complet, valide):
{
  "arcs": [
    {
      "chapter": 1,
      "title": "titre du chapitre",
      "intensity": 65,
      "emotion": "espoir",
      "subEmotion": "melancolie",
      "note": "une phrase sur ce qui se passe emotionnellement",
      "isKeyMoment": false,
      "keyMomentType": null
    }
  ],
  "globalNote": "analyse globale du livre en 2-3 phrases",
  "pattern": {
    "name": "ex: Voyage du Heros / Tragedie / Crescendo / Montagne Russe / En U / Chute Libre / Renaissance",
    "description": "2-3 phrases expliquant pourquoi ce pattern s'applique a ce livre",
    "coherenceScore": 78,
    "comparison": "ex: Proche de L'Alchimiste / Rappelle La Metamorphose / Structure similaire a Toni Morrison"
  },
  "dynamism": {
    "score": 72,
    "label": "ex: Tres dynamique / Dynamique / Moyen / Monotone",
    "weakChapters": [2, 5],
    "overloadedChapters": [8],
    "recommendations": [
      { "chapter": 2, "issue": "ex: Trop plat, pas de variation d'intensite", "suggestion": "suggestion concrete en 1-2 phrases" }
    ]
  },
  "turningPoints": [
    {
      "chapter": 3,
      "fromEmotion": "colere",
      "toEmotion": "espoir",
      "type": "climax",
      "description": "description de la bascule et son impact narratif"
    }
  ]
}

Regles:
- intensity entre 0 et 100
- emotion parmi: espoir, joie, surprise, peur, colere, tristesse, serenite, tension, mystere, revelation, amour, honte, deuil, extase, angoisse
- subEmotion: une 2eme emotion differente de emotion principale
- isKeyMoment: true si c'est un climax, nadir, revelation ou retournement majeur
- keyMomentType: "climax" | "nadir" | "revelation" | "twist" | null
- turningPoints: les 2-4 moments de bascule emotionnelle les plus importants
- coherenceScore et dynamism.score entre 0 et 100`,
          },
        ],
        temperature: 0.45,
        max_tokens: 3500,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      try {
        const jsonStr = extractJson(raw);
        return NextResponse.json(JSON.parse(jsonStr));
      } catch {
        return NextResponse.json({ _error: "parse_failed" }, { status: 422 });
      }
    }


    // â”€â”€ PRICE OPTIMIZER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "price_optimizer") {
      const { bookTitle, category, pages, targetMarket } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en stratÃ©gie de pricing pour l'Ã©dition numÃ©rique indÃ©pendante." },
          { role: "user", content: `Prix optimal pour: "${bookTitle}" | CatÃ©gorie: ${category} | Pages: ${pages || "?"} | MarchÃ©: ${targetMarket || "francophone"}

1. PRIX RECOMMANDÃ‰ + PRIX PSYCHOLOGIQUE optimal
2. ANALYSE CONCURRENCE dans cette catÃ©gorie
3. STRATÃ‰GIE DE LANCEMENT (prix intro vs dÃ©finitif)
4. PRIX PAR PLATEFORME (KDP, Kobo, D2D)
5. IMPACT ROYALTIES Ã  chaque palier de prix
6. SCORE CONFIANCE /10` },
        ],
        temperature: 0.5, max_tokens: 1200,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ AMS ADS COPY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "ams_ads") {
      const { bookTitle, category, targetKeywords, authorName } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en publicitÃ© Amazon Marketing Services (AMS) pour livres numÃ©riques." },
          { role: "user", content: `Copies AMS pour "${bookTitle}" (${category}) de ${authorName || "l'auteur"}.
Mots-clÃ©s cibles: ${targetKeywords || ""}

1. TITRE PUB (max 50 chars): 3 variantes
2. DESCRIPTION (max 150 chars): 3 variantes
3. HEADLINE SPONSORISÃ‰ (max 50 chars): 3 variantes
4. 20 MOTS-CLÃ‰S EXACTS Ã  cibler
5. 10 MOTS-CLÃ‰S NÃ‰GATIFS Ã  exclure
6. BUDGET & CPC recommandÃ©
7. A/B TEST: quelle variante tester en premier` },
        ],
        temperature: 0.7, max_tokens: 1500,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ COMPETITOR X-RAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "competitor_xray") {
      const { niche, category, titles } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse concurrentielle pour l'Ã©dition numÃ©rique indÃ©pendante." },
          { role: "user", content: `Analyse concurrentielle: niche "${niche}" (${category || "Non-fiction"}).
Concurrents mentionnÃ©s: ${titles || "non spÃ©cifiÃ©s"}

1. NIVEAU DE SATURATION (Faible/Moyen/Fort)
2. GAPS DU MARCHÃ‰: ce que les concurrents ne couvrent pas
3. 5 ANGLES DIFFÃ‰RENCIANTS
4. PATTERNS DE TITRES qui fonctionnent
5. FAIBLESSES COMMUNES (d'aprÃ¨s les avis types)
6. STRATÃ‰GIE DE POSITIONNEMENT recommandÃ©e
7. 3 SOUS-NICHES moins compÃ©titives
8. SCORE D'OPPORTUNITÃ‰ /10` },
        ],
        temperature: 0.65, max_tokens: 1500,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ READER SENTIMENT MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "sentiment_map") {
      const { reviews, bookTitle } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en analyse de sentiment lecteur. RÃ©ponds en JSON valide." },
          { role: "user", content: `Analyse ces avis pour "${bookTitle || "ce livre"}":
${(reviews as string).substring(0, 5000)}

JSON:
{"positifs":["..."],"negatifs":["..."],"attentes":["..."],"mots_cles":["..."],"profil":"...","score":7.5,"recommandation":"..."}` },
        ],
        temperature: 0.4, max_tokens: 1200,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      return NextResponse.json(JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()));
    }

    // â”€â”€ NICHE TREND RADAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "trend_radar") {
      const { category, language } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en tendances Ã©ditoriales numÃ©riques 2024-2025." },
          { role: "user", content: `Tendances niches Ã©ditoriales pour ${category || "tous genres"} en ${language || "franÃ§ais"}.

1. TOP 5 NICHES EN EXPLOSION (score croissance, pourquoi, durÃ©e)
2. NICHES Ã‰MERGENTES (surveiller dans 6-12 mois)
3. NICHES SATURÃ‰ES (Ã  Ã©viter)
4. ANGLE VIRAL DU MOMENT
5. 10 MOTS-CLÃ‰S TENDANCE
6. PLATEFORMES OÃ™ CES NICHES PERCENT
7. FENÃŠTRE D'OPPORTUNITÃ‰ estimÃ©e` },
        ],
        temperature: 0.7, max_tokens: 1500,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ PLAGIARISM CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "plagiarism_check") {
      const { bookTitle, content } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en originalitÃ© du contenu et dÃ©tection de similaritÃ©s." },
          { role: "user", content: `OriginalitÃ© du livre "${bookTitle}":
${(content as string).substring(0, 5000)}

1. SCORE D'ORIGINALITÃ‰ /100
2. PHRASES GÃ‰NÃ‰RIQUES (trop communes)
3. CONCEPTS TROP SIMILAIRES Ã  des Å“uvres connues
4. ZONES Ã€ RISQUE
5. RECOMMANDATIONS pour renforcer l'originalitÃ©
6. POINTS FORTS UNIQUES
7. VERDICT: Safe / Attention / Risque Ã©levÃ©` },
        ],
        temperature: 0.3, max_tokens: 1200,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ READING AGE CALIBRATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "reading_age") {
      const { content, targetLevel, bookTitle } = body;
      const levelMap: Record<string, string> = {
        "enfant": "niveau CE2-CM2 (8-11 ans), phrases courtes, vocabulaire simple",
        "ado": "niveau collÃ¨ge-lycÃ©e (12-17 ans), accessible et engageant",
        "adulte_general": "grand public adulte, fluide et accessible",
        "expert": "professionnel/expert, vocabulaire technique assumÃ©",
      };
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `RÃ©Ã©cris ce contenu de "${bookTitle}" pour un ${levelMap[targetLevel as string] || "adulte gÃ©nÃ©ral"}.
Garde les idÃ©es, adapte le style et le vocabulaire.
CONTENU:
${(content as string).substring(0, 3000)}
Retourne UNIQUEMENT le texte adaptÃ©.` },
        ],
        temperature: 0.7, max_tokens: 2000,
      });
      return NextResponse.json({ result: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ AUTO-TRANSLATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "translate_book") {
      const { content, targetLanguage, bookTitle, chapterTitle } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: `Tu es traducteur littÃ©raire professionnel. Tu traduis en ${targetLanguage} de faÃ§on naturelle et idiomatique.` },
          { role: "user", content: `Traduis "${chapterTitle || ""}" du livre "${bookTitle || ""}" en ${targetLanguage}.
Traduction naturelle, adapte les rÃ©fÃ©rences culturelles.
ORIGINAL:
${(content as string).substring(0, 4000)}
Retourne UNIQUEMENT la traduction.` },
        ],
        temperature: 0.6, max_tokens: 3000,
      });
      return NextResponse.json({ translation: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ BOOK-TO-COURSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "book_to_course") {
      const { bookTitle, category, chapters } = body;
      const chapterList = (chapters as { title: string; content: string }[])
        .map((c, i) => `Module ${i + 1}: "${c.title}" â€” ${c.content.substring(0, 200)}`).join("\n");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en ingÃ©nierie pÃ©dagogique et crÃ©ation de formations en ligne." },
          { role: "user", content: `Transforme "${bookTitle}" (${category}) en formation en ligne structurÃ©e.
Chapitres: ${chapterList}

1. TITRE DE LA FORMATION + PROMESSE DE TRANSFORMATION
2. PRÃ‰REQUIS
3. MODULES (basÃ©s sur les chapitres): titre, objectif, 3-4 leÃ§ons, exercice pratique, quiz 3 questions
4. BONUS suggÃ©rÃ©s (workbook, templates, communautÃ©)
5. PRIX RECOMMANDÃ‰
6. PLATEFORME RECOMMANDÃ‰E (Teachable, Kajabi, Gumroad...)` },
        ],
        temperature: 0.75, max_tokens: 3000,
      });
      return NextResponse.json({ course: cleanText(completion.choices[0].message.content || "") });
    }

    // ── READER AVATAR BUILDER ────────────────────────────────────────────────
    if (action === "reader_avatar") {
      const { bookTitle, category, targetDescription, chapters: bookChapters } = body as {
        bookTitle: string; category: string; targetDescription?: string;
        chapters?: { title: string; content: string }[];
      };

      const bookDigest = bookChapters && bookChapters.length > 0
        ? bookChapters.slice(0, 6).map((c, i) => `Ch.${i + 1} "${c.title}": ${(c.content || "").substring(0, 300)}`).join('\n')
        : "";

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Tu es expert en marketing, psychologie du consommateur et segmentation d'audience. Tu reponds UNIQUEMENT avec un tableau JSON valide de 3 objets. Zero texte autour, zero markdown.",
          },
          {
            role: "user",
            content: `Analyse profonde d'audience pour le livre "${bookTitle}" (${category}).
Cible precisee: ${targetDescription || "marche francophone general"}
${bookDigest ? `
CONTENU DU LIVRE (extrait pour analyse grondee dans le texte reel):
${bookDigest}` : ""}

Genere 3 PERSONAS RADICALEMENT DIFFERENTS — ages, profils socio-economiques, motivations et rapports au livre vraiment distincts.
IMPORTANT: chaque champ doit etre specifique a CE livre et CE profil — zero reponse generique.

Reponds UNIQUEMENT avec ce JSON (3 objets complets):
[
  {
    "segment": "Segment 1 — [nom court du profil ex: L'Ambitieux Presse]",
    "prenom": "prenom realiste africain ou francophone",
    "age": 27,
    "genre": "H",
    "profession": "profession precise avec contexte",
    "revenu_mensuel": "ex: 350 000 FCFA",
    "situation": "description de sa vie actuelle en 2-3 phrases concretes et specifiques",
    "frustration_quotidienne": "ce qui l'enerve ou le bloque tous les jours — tres specifique",
    "probleme_principal": "le probleme exact que ce livre resout pour LUI",
    "transformation_esperee": "la transformation precise qu'il espere apres ce livre",
    "ce_quils_vont_adorer": ["aspect specifique du livre qu'il va adorer", "aspect 2", "aspect 3"],
    "ce_qui_peut_les_decevoir": ["risque de deception specifique a ce profil et ce livre", "deception potentielle 2"],
    "desirs_profonds": ["desir profond 1", "desir profond 2", "desir profond 3"],
    "peurs": ["peur 1 specifique a son profil", "peur 2", "peur 3"],
    "resistance_profonde": "le vrai frein psychologique qui l'empeche d'acheter — non generique",
    "objections_achat": ["objection 1 reelle", "objection 2", "objection 3"],
    "declencheurs_dachat": ["ce qui declenche vraiment l'achat", "declencheur 2"],
    "moment_dachat_ideal": "le contexte exact ou il achete (ex: apres temoignage, en mode resolution...)",
    "mots_qui_convertissent": ["mot ou phrase 1", "mot 2", "mot 3", "mot 4"],
    "mots_a_eviter": ["mot qui le fait fuir", "mot 2"],
    "angle_marketing_principal": "l'angle #1 le plus puissant — specifique et actionnable",
    "message_marketing": "la phrase exacte de 1-2 lignes qui fait acheter CE profil",
    "ton_communication": "ex: direct sans fioriture / emotionnel inspirant / analytique factuel",
    "canaux_prioritaires": ["canal 1 specifique", "canal 2"],
    "type_contenu_prefere": ["format contenu 1", "format 2"],
    "erreurs_marketing_a_eviter": "ce qui le fait fuir ou perdre confiance — specifique",
    "parcours_client": "comment il decouvre => s'interesse => hesite => achete => recommande"
  },
  {
    "segment": "Segment 2 — [profil tres different ex: La Mere Resiliente]",
    "prenom": "prenom F", "age": 38, "genre": "F", "profession": "...", "revenu_mensuel": "...",
    "situation": "...", "frustration_quotidienne": "...", "probleme_principal": "...",
    "transformation_esperee": "...", "ce_quils_vont_adorer": ["...","...","..."],
    "ce_qui_peut_les_decevoir": ["...","..."], "desirs_profonds": ["...","...","..."],
    "peurs": ["...","...","..."], "resistance_profonde": "...",
    "objections_achat": ["...","...","..."], "declencheurs_dachat": ["...","..."],
    "moment_dachat_ideal": "...", "mots_qui_convertissent": ["...","...","...","..."],
    "mots_a_eviter": ["...","..."], "angle_marketing_principal": "...",
    "message_marketing": "...", "ton_communication": "...",
    "canaux_prioritaires": ["...","..."], "type_contenu_prefere": ["...","..."],
    "erreurs_marketing_a_eviter": "...", "parcours_client": "..."
  },
  {
    "segment": "Segment 3 — [profil encore different ex: Le Sceptique Cultive]",
    "prenom": "prenom", "age": 52, "genre": "H", "profession": "...", "revenu_mensuel": "...",
    "situation": "...", "frustration_quotidienne": "...", "probleme_principal": "...",
    "transformation_esperee": "...", "ce_quils_vont_adorer": ["...","...","..."],
    "ce_qui_peut_les_decevoir": ["...","..."], "desirs_profonds": ["...","...","..."],
    "peurs": ["...","...","..."], "resistance_profonde": "...",
    "objections_achat": ["...","...","..."], "declencheurs_dachat": ["...","..."],
    "moment_dachat_ideal": "...", "mots_qui_convertissent": ["...","...","...","..."],
    "mots_a_eviter": ["...","..."], "angle_marketing_principal": "...",
    "message_marketing": "...", "ton_communication": "...",
    "canaux_prioritaires": ["...","..."], "type_contenu_prefere": ["...","..."],
    "erreurs_marketing_a_eviter": "...", "parcours_client": "..."
  }
]`,
          },
        ],
        temperature: 0.92,
        max_tokens: 4000,
      });
      const raw = completion.choices[0].message.content?.trim() || "[]";
      try {
        const jsonStr = extractJson(raw);
        const parsed = JSON.parse(jsonStr);
        const avatars = Array.isArray(parsed) ? parsed : [parsed];
        if (avatars.length === 0 || !avatars[0].prenom) throw new Error("invalid");
        return NextResponse.json({ avatars });
      } catch {
        return NextResponse.json({ _error: "parse_failed", raw: raw.substring(0, 300) }, { status: 422 });
      }
    }

    if (action === "viral_hooks") {
      const { bookTitle, category, promise } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en copywriting viral et psychologie de l'attention." },
          { role: "user", content: `20 accroches virales pour "${bookTitle}" (${category}).
Promesse: ${promise || ""}

5 accroches de chaque type:
TYPE 1 â€” CURIOSITÃ‰ (gap d'information)
TYPE 2 â€” CHOC / CONTRE-INTUITIF
TYPE 3 â€” BÃ‰NÃ‰FICE DIRECT
TYPE 4 â€” SOCIAL PROOF
TYPE 5 â€” PEUR / URGENCE

Format: [accroche] | [format idÃ©al: Titre/Post/Reel/Thread/Email]` },
        ],
        temperature: 0.9, max_tokens: 2000,
      });
      return NextResponse.json({ hooks: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ EVERGREEN FUNNEL BUILDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "funnel_builder") {
      const { bookTitle, authorName, price, leadMagnetIdea } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en funnels de vente evergreen pour auteurs indÃ©pendants." },
          { role: "user", content: `Funnel evergreen pour "${bookTitle}" de ${authorName || "l'auteur"} (${price || "9,99â‚¬"}).
Lead magnet idÃ©e: ${leadMagnetIdea || "Ã  dÃ©finir"}

1. LEAD MAGNET: titre + description + format
2. PAGE DE CAPTURE: H1 + sous-titre + 3 bullets + CTA
3. SÃ‰QUENCE 7 EMAILS (J0 Ã  J6): OBJET + PRÃ‰HEADER + RÃ‰SUMÃ‰ 80 mots chacun
   J0: livraison lead magnet | J1: histoire | J2: valeur | J3: preuve | J4: valeur 2 | J5: prÃ©sentation livre | J6: offre + CTA
4. 3 EMAILS POST-ACHAT (nurturing)
5. EMAIL RÃ‰ACTIVATION 6 semaines aprÃ¨s` },
        ],
        temperature: 0.8, max_tokens: 4000,
      });
      return NextResponse.json({ funnel: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ IP EXPANSION PLANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "ip_expansion") {
      const { bookTitle, category, authorName } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en dÃ©veloppement de propriÃ©tÃ© intellectuelle et stratÃ©gie multi-format pour auteurs." },
          { role: "user", content: `Plan d'expansion IP pour "${bookTitle}" (${category}) de ${authorName || "l'auteur"}.

PHASE 1 (0-3 mois): Workbook, threads, lead magnet, quiz
PHASE 2 (3-6 mois): Formation en ligne, challenge 30 jours, communautÃ© payante, webinaire
PHASE 3 (6-12 mois): Livre papier, planner physique, deck de cartes, coaching premium
PHASE 4 (12+ mois): Podcast, licences, confÃ©rences, partenariats auteurs

Pour chaque produit: revenus estimÃ©s, effort (1-5), prioritÃ© (Haute/Moyenne/Basse)` },
        ],
        temperature: 0.75, max_tokens: 3000,
      });
      return NextResponse.json({ expansion: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ PLOT TWIST ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "plot_twist") {
      const { bookTitle, category, chapterTitle, content, twistType } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_AUTHOR },
          { role: "user", content: `Dans "${bookTitle}" (${category}), chapitre "${chapterTitle}":
Type de tournant: ${twistType || "rÃ©vÃ©lation contre-intuitive"}
Contexte: ${(content || "").substring(0, 800)}

Propose 3 tournants:
1. [MODÃ‰RÃ‰]: description + 3 phrases de transition + impact
2. [FORT]: description + 3 phrases de transition + impact
3. [RADICAL]: description + 3 phrases de transition + impact` },
        ],
        temperature: 0.92, max_tokens: 1500,
      });
      return NextResponse.json({ twists: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ AUTHOR PERSONA CREATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "persona_create") {
      const { realName, niche, style, values } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu crÃ©es des personas d'auteur fictifs authentiques pour l'Ã©dition indÃ©pendante." },
          { role: "user", content: `Persona d'auteur pour niche: "${niche}" | Style: ${style || "expert accessible"} | Valeurs: ${values || "authenticitÃ©, impact"} | Inspiration: ${realName || "non fourni"}

1. NOM DE PLUME mÃ©morable
2. BIO COURTE (50 mots, Amazon/Kobo)
3. BIO LONGUE (150 mots, page de vente)
4. HISTOIRE D'ORIGINE (100 mots)
5. 3 Ã‰LÃ‰MENTS SIGNATURE DU STYLE
6. DESCRIPTION PHOTO (pour gÃ©nÃ©ration IA)
7. PROFILS SOCIAUX: Instagram (150 chars) + LinkedIn + TikTok
8. 5 ACTIONS pour rendre ce persona crÃ©dible
9. LIGNE Ã‰DITORIALE: 3 thÃ¨mes principaux` },
        ],
        temperature: 0.85, max_tokens: 2000,
      });
      return NextResponse.json({ persona: cleanText(completion.choices[0].message.content || "") });
    }

    // â”€â”€ ROYALTY FORECAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "royalty_forecast") {
      const { bookTitle, price, currentSales, category, platforms } = body;
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es expert en prÃ©visions financiÃ¨res pour auteurs indÃ©pendants. RÃ©ponds en JSON valide." },
          { role: "user", content: `PrÃ©visions royalties pour "${bookTitle}" | Prix: ${price}â‚¬ | Ventes actuelles/mois: ${currentSales || 0} | CatÃ©gorie: ${category} | Plateformes: ${platforms || "KDP"}

GÃ©nÃ¨re des scÃ©narios sur 12 mois:
JSON:
{
  "scenarios": {
    "pessimiste": {"mensuel": [10,12,...], "annuel_total": 1200, "description": "..."},
    "realiste": {"mensuel": [20,25,...], "annuel_total": 3000, "description": "..."},
    "optimiste": {"mensuel": [50,70,...], "annuel_total": 8000, "description": "..."}
  },
  "breakEven": "combien de ventes pour couvrir les coÃ»ts",
  "conseils": ["conseil 1", "conseil 2", "conseil 3"]
}` },
        ],
        temperature: 0.4, max_tokens: 2000,
      });
      const raw = completion.choices[0].message.content?.trim() || "{}";
      return NextResponse.json(JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()));
    }

    // â”€â”€ BOOK INSPIRATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (action === "book_inspiration") {
      const { books, newCategory, newAudience } = body;
      // books = array of { title, category, summary (first 300 chars of content) }
      const bookList = (books as { title: string; category: string; summary: string }[])
        .map((b, i) => `${i + 1}. "${b.title}" (${b.category}): ${b.summary}`)
        .join("\n");
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "Tu es un Ã©diteur visionnaire spÃ©cialisÃ© dans les livres Ã  succÃ¨s. Tu analyses des Å“uvres existantes pour en distiller l'essence et crÃ©er de nouvelles idÃ©es uniques." },
          { role: "user", content: `Analyse ces livres existants et gÃ©nÃ¨re 3 idÃ©es de nouveaux livres originaux qui s'en inspirent:

LIVRES D'INSPIRATION:
${bookList}

${newCategory ? `CatÃ©gorie souhaitÃ©e: ${newCategory}` : ""}
${newAudience ? `Audience cible: ${newAudience}` : ""}

Pour chaque idÃ©e, fournis:
- TITRE: (accrocheur et mÃ©morable)
- CONCEPT: (2-3 phrases â€” l'idÃ©e centrale unique)
- CE QUI L'INSPIRE: (quels Ã©lÃ©ments sont pris des livres d'origine)
- TWIST UNIQUE: (ce qui rend ce livre diffÃ©rent)
- PLAN: (5-7 titres de chapitres)
- CIBLE: (profil du lecteur idÃ©al)
- POTENTIEL: (estimation du marchÃ©)

NumÃ©rote chaque idÃ©e clairement. Sois crÃ©atif, ambitieux et commercial.` },
        ],
        temperature: 0.85, max_tokens: 2500,
      });
      return NextResponse.json({ ideas: cleanText(completion.choices[0].message.content || "") });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


