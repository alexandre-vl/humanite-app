/**
 * Real answers of the journal's service, so a schema is held against what it sends and not against what we remember
 * of it. Written by `pnpm capture:read`; never edited by hand.
 *
 * Bodies are trimmed: the opening of the prose and the head of the donation block the service closes every article
 * with. The block is what a reading has to recognise and cut, so its head is kept; the prose is the journal's to
 * publish, so only enough of it is kept to read a structure. Nothing here is ever served to a reader.
 *
 * Articles are keyed by the format the service gave them. This capture held `opinion`, `video`.
 * A session that opens a format no capture has shown yet lands under a new key, and the tests that walk this table
 * cover it without a line changing.
 */

import { SECTIONS_KEY } from './remote.ts';

export const RECORDED = {
  front: {
    posts: [
      {
        id: '3861029',
        date: '2026-09-21T16:01:00',
        slug: 'elections-en-allemagne-victoire-de-la-gauche-percee-de-lafd-et-crise-pour-merz',
        title: 'Élections en Allemagne : victoire de la gauche, percée de l’AfD et crise pour Merz',
        right: false,
        excerpt:
          '<p>Au lendemain des élections à Berlin et dans le Land de Mecklembourg-Poméranie-occidentale, qui ont vu dimanche la victoire de la gauche de Die Linke dans la capitale fédérale et une nouvelle percée spectaculaire de l’extrême droite, en tête dans le Land du nord de l’Allemagne, le pays est plongé dans la sidération. Pour le gouvernement du…</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Au lendemain des élections à Berlin et dans le Land de Mecklembourg-Poméranie-occidentale, qui ont vu dimanche la victoire de la gauche de Die Linke dans la capitale fédérale et une nouvelle percée spectaculaire de l’extrême droite, en tête dans le Land du nord de l’Allemagne, le pays est plongé dans la sidération. Pour le gouvernement du chancelier (CDU) Friedrich Merz, les jours semblent comptés.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/Allemagne-crise.jpg?w=1200',
        author: 'Benjamin König',
        article_format: 'video',
        video_cover: 3861040,
        video_url: 'https://youtu.be/dfZt_ZVhtus',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3860965',
        date: '2026-09-21T20:54:34',
        slug: 'en-1970-30-du-patrimoine-des-francais-etait-herite-aujourdhui-cest-70-pourquoi-faut-il-en-finir-avec-notre-societe-dheritiers',
        title:
          '« En 1970, 30 % du patrimoine des Français était hérité. Aujourd’hui, c’est 70 % » : pourquoi faut-il en finir avec notre société d’héritiers ?',
        right: false,
        excerpt:
          '<p>Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/p4-debat-heritage_MAR.jpg?w=1200',
        image_caption:
          'L’Agora de la Fête de l’Humanité le 13 septembre dernier. Cécile Duflot, Alexandre Ouizille et Mélanie Plouviez y ont débattu de la place de l’héritage en France.',
        author: 'Pierric Marissal',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3860168',
        date: '2026-09-21T19:21:24',
        slug: 'budget-2027-alerte-enlevement-ou-sont-les-5-milliards-promis-aux-collectivites-locales-par-sebastien-lecornu',
        title:
          'Budget 2027 : alerte enlèvement, où sont les 5 milliards promis aux collectivités locales par Sébastien Lecornu ?',
        right: false,
        excerpt:
          '<p>Une semaine avant les élections sénatoriales, le premier ministre vient de donner un coup de pouce électoraliste à la droite en promettant, dans le projet de loi de finances 2027, d’amoindrir de 5&nbsp;milliards d’euros la douloureuse austéritaire pour les communes, les départements et les régions.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Une semaine avant les élections sénatoriales, le premier ministre vient de donner un coup de pouce électoraliste à la droite en promettant, dans le projet de loi de finances 2027, d’amoindrir de 5&nbsp;milliards d’euros la douloureuse austéritaire pour les communes, les départements et les régions.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-21-at-19.11.44.jpeg?w=1200',
        image_caption:
          'Trois jours après le serment de Sébastien Lecornu, «&nbsp;nous n’en savons rien de plus&nbsp;», assure un dirigeant d’association d’élus locaux. © Alexis Jumeau/ABACAPRESS.COM',
        author: 'Stéphane Guérard',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3860381',
        date: '2026-09-21T15:24:30',
        slug: 'journalistes-reunis-en-soviet-nouvelle-loi-des-suspects-au-figaro-le-retrait-de-charles-sapin-de-france-inter-passe-mal',
        title:
          '« Journalistes réunis en soviet », « nouvelle loi des suspects » : au « Figaro », le retrait de Charles Sapin de France Inter passe mal',
        right: false,
        excerpt:
          '<p>Le Figaro l’affirme, Radio France est «&nbsp;dans la tourmente après l’éviction de Charles Sapin&nbsp;». Une éviction, pas tout à fait. Le directeur adjoint de l’hebdomadaire d’extrême droite Valeurs Actuelles a lui-même écarté la dernière proposition qui lui était faite&nbsp;: un débat à la place d’un éditorial. Mais la tourmente, c’est plutôt, dit familièrement, la direction de…</p>\n',
        premium: true,
        highlighted: null,
        description: '\n\n<p class="chapo"></p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2024/02/Vignette_2024_bilet_maurice_ebf473.png?w=1200',
        author: 'Maurice Ulrich',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  wire: {
    posts: [
      {
        id: '3860965',
        date: '2026-09-21T20:54:34',
        slug: 'en-1970-30-du-patrimoine-des-francais-etait-herite-aujourdhui-cest-70-pourquoi-faut-il-en-finir-avec-notre-societe-dheritiers',
        title:
          '« En 1970, 30 % du patrimoine des Français était hérité. Aujourd’hui, c’est 70 % » : pourquoi faut-il en finir avec notre société d’héritiers ?',
        right: false,
        excerpt:
          '<p>Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/p4-debat-heritage_MAR.jpg?w=1200',
        image_caption:
          'L’Agora de la Fête de l’Humanité le 13 septembre dernier. Cécile Duflot, Alexandre Ouizille et Mélanie Plouviez y ont débattu de la place de l’héritage en France.',
        author: 'Pierric Marissal',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3862047',
        date: '2026-09-21T20:44:34',
        slug: 'basket-lancien-capitaine-des-bleus-nicolas-batum-prend-sa-retraite',
        title: 'Basket : l’ancien capitaine des Bleus Nicolas Batum prend sa retraite',
        right: false,
        excerpt:
          '<p>Nicolas Batum, 37 ans, a annoncé ce lundi 21 septembre la fin de sa carrière après 21 ans de basket professionnel, dont 18 passés en NBA. Vice-champion olympique en 2021 et 2024, champion d’Europe en 2013, l’ancien capitaine des Bleus reste associé à son contre légendaire face à la Slovénie aux JO de Tokyo, qui avait envoyé la France…</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Nicolas Batum, 37 ans, a annoncé ce lundi 21 septembre la fin de sa carrière après 21 ans de basket professionnel, dont 18 passés en NBA. Vice-champion olympique en 2021 et 2024, champion d’Europe en 2013, l’ancien capitaine des Bleus reste associé à son contre légendaire face à la Slovénie aux JO de Tokyo, qui avait envoyé la France en finale.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/batum.jpg?w=1200',
        image_caption:
          'Batum affiche très tôt un profil rare de couteau suisse, à l’aise aussi bien en attaque qu’en défense. © Yasuyoshi CHIBA / AFP',
        author: 'La rédaction',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  sections: {
    [SECTIONS_KEY]: [
      {
        id: 19565,
        count: 20,
        name: 'Politique',
        slug: 'politique',
        link: 'https://www.humanite.fr/./politique/',
        description: '',
      },
      {
        id: 19566,
        count: 20,
        name: 'Social Éco',
        slug: 'social-eco',
        link: 'https://www.humanite.fr/sections/social-et-economie/',
        description: '',
      },
      {
        id: 19567,
        count: 20,
        name: 'Société',
        slug: 'societe',
        link: 'https://www.humanite.fr/./societe/',
        description: '',
      },
      {
        id: 19568,
        count: 20,
        name: 'Monde',
        slug: 'monde',
        link: 'https://www.humanite.fr/sections/monde/',
        description: '',
      },
      {
        id: 19569,
        count: 20,
        name: 'Culture et savoir',
        slug: 'culture-et-savoir',
        link: 'https://www.humanite.fr/./culture-et-savoir/',
        description: '',
      },
      {
        id: 19939,
        count: 20,
        name: 'Féminisme',
        slug: 'feminisme',
        link: 'https://www.humanite.fr/./feminisme/',
        description: '',
      },
      {
        id: 19610,
        count: 20,
        name: 'Environnement',
        slug: 'environnement',
        link: 'https://www.humanite.fr/./environnement/',
        description: '',
      },
      {
        id: 19572,
        count: 20,
        name: 'Sciences',
        slug: 'sciences',
        link: 'https://www.humanite.fr/./sciences/',
        description: '',
      },
      {
        id: 19570,
        count: 20,
        name: 'Médias',
        slug: 'medias',
        link: 'https://www.humanite.fr/./medias/',
        description: '',
      },
      {
        id: 19575,
        count: 20,
        name: 'En débat',
        slug: 'en-debat',
        link: 'https://www.humanite.fr/./en-debat/',
        description: '',
      },
      {
        id: 19573,
        count: 20,
        name: 'Histoire',
        slug: 'histoire',
        link: 'https://www.humanite.fr/./histoire/',
        description: '',
      },
    ],
  },
  sectionFeed: {
    posts: [
      {
        id: '3855795',
        date: '2026-09-20T09:01:00',
        slug: 'puy-du-fou-de-gauche-francois-ruffin-face-a-trois-historiens-fete-de-lhumanite-2026',
        title: '« Puy du fou de gauche » : François Ruffin face à trois historiens – Fête de l’Humanité 2026',
        right: false,
        excerpt:
          '<p>Face au roman national réactionnaire, monarchiste et contre-révolutionnaire du Puy du Fou, qui rencontre un indéniable succès idéologique comme touristique, comment la gauche et les citoyens peuvent-ils réinvestir le champ de l’histoire ?</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Face au roman national réactionnaire, monarchiste et contre-révolutionnaire du Puy du Fou, qui rencontre un indéniable succès idéologique comme touristique, comment la gauche et les citoyens peuvent-ils réinvestir le champ de l’histoire ?</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/Puy-du-fou-de-gauche.webp?w=1200',
        author: 'Aurélien Soucheyre',
        article_format: 'video',
        video_cover: 3855802,
        video_url: 'https://youtu.be/KCUigtb6V6E',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3837603',
        date: '2026-09-18T13:27:32',
        slug: '23-septembre-1926-une-legende-est-nee-john-coltrane-un-musicien-en-quete-de-liberte',
        title: '23 septembre 1926, une légende est née : John Coltrane, un musicien en quête de liberté',
        right: false,
        excerpt:
          '<p>Le saxophoniste né il y a 100&nbsp;ans reste l’un des musiciens les plus influents du XXe&nbsp;siècle. Par sa quête d’absolu et la maîtrise de son instrument, il aura également été une figure majeure de la culture afro-américaine, célébrée dans le monde entier.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Le saxophoniste né il y a 100&nbsp;ans reste l’un des musiciens les plus influents du XX<sup>e</sup>&nbsp;siècle. Par sa quête d’absolu et la maîtrise de son instrument, il aura également été une figure majeure de la culture afro-américaine, célébrée dans le monde entier.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/ieuf-coltrane-1_HD3Tvh.jpg?w=1200',
        image_caption:
          'Dans son œuvre, Coltrane a porté l’idée d’un retour du jazz à ses origines africaines. © Hervé GLOAGUEN/GAMMA RAPHO',
        author: 'Clément Garcia',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3837391',
        date: '2026-09-08T17:11:03',
        slug: 'en-1984-nina-hagen-une-extraterrestre-punk-sur-la-scene-de-la-fete-de-lhumanite',
        title: 'En 1984, Nina Hagen, une extraterrestre punk sur la scène de la Fête de l&#8217;Humanité',
        right: false,
        excerpt:
          '<p>Entre opéra, punk et rock, l’extravagante artiste allemande transforme la scène de la Fête en théâtre cosmique. Avec un message profondément politique&nbsp;: le refus de la guerre nucléaire.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Entre opéra, punk et rock, l’extravagante artiste allemande transforme la scène de la Fête en théâtre cosmique. Avec un message profondément politique&nbsp;: le refus de la guerre nucléaire.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/DER-NINA-hAGEN_MER-edited.jpg?w=1200',
        image_caption:
          "Avec son maquillage excentrique, son corsage de résille noir, sa jupe en lambeaux et ses collants déchirés, Nina Hagen, tantôt mystique, tantôt burlesque, mime chaque morceau et habite toute la scène. © MEMOIRES D'HUMANITE/ARCHIVES DEPARTEMENTALES DE LA SEINE SAINT DENIS",
        author: 'Rosa Moussaoui',
        article_format: 'serie',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3818070',
        date: '2026-08-26T13:53:11',
        slug: 'le-cheminement-clandestin-des-lumieres',
        title: 'Le cheminement clandestin des Lumières',
        right: false,
        excerpt:
          '<p>Le philosophe Bernard Vasseur revient sur le travail précieux de la revue La lettre clandestine qui met à jour le travail des artisans des Lumières.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Le philosophe Bernard Vasseur revient sur le travail précieux de la revue La lettre clandestine qui met à jour le travail des artisans des Lumières. </p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/07/Vignette_2024_tribune_97bbf4_cc15d3.webp?w=1023',
        author: 'Bernard Vasseur',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  search: {
    success: true,
    posts: [
      {
        id: '3821982',
        date: '2026-09-05T14:57:09',
        slug: 'apres-lete-des-pires-records-ne-pas-tourner-la-page',
        title: 'Après l’été des pires records, ne pas tourner la page',
        right: false,
        excerpt:
          '<p>En temps normal, je suis plutôt du genre à tourner rapidement les pages de la vie et à regarder davantage vers l’avenir que vers le passé. Mais aujourd’hui l’attitude inverse me semble incontournable. Loin de se classer dans la liste des étés « pourris » du passé récent, l’été 2026 synthétise ce que nous allons avoir à traverser…</p>\n',
        premium: true,
        highlighted: null,
        description: '\n\n<p class="chapo"></p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2024/10/Vignette-chroniqueur-Maryse-dumas.png?w=1200',
        author: 'Maryse Dumas',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3766601',
        date: '2026-07-19T16:29:16',
        slug: 'la-lutte-des-classes-nest-plus-seulement-pour-la-repartition-des-fruits-du-travail-mais-aussi-pour-lhabitabilite-du-monde-entretien-avec-jacques-baudrier',
        title:
          '«  La lutte des classes  n&#8217;est plus seulement pour la répartition des fruits du travail, mais aussi pour l’habitabilité du monde » : entretien avec Jacques Baudrier',
        right: false,
        excerpt:
          '<p>Adjoint PCF à la mairie de Paris, Jacques Baudrier appelle à se saisir du concept de lutte des classes pour mener la bataille écologique.&nbsp;Avec des propositions pour rendre accessibles les véhicules électriques et la rénovation thermique des logements, comme exemples de mesures répondant à la fois aux exigences sociales et environnementales.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Adjoint PCF à la mairie de Paris, Jacques Baudrier appelle à se saisir du concept de lutte des classes pour mener la bataille écologique.&nbsp;Avec des propositions pour rendre accessibles les véhicules électriques et la rénovation thermique des logements, comme exemples de mesures répondant à la fois aux exigences sociales et environnementales.  </p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/07/iStock-686143506.jpg?w=1200',
        image_caption:
          '« Les plus riches pourront toujours se construire des bulles climatisées pour se garantir une qualité de vie&nbsp;quand certaines zones du monde vont devenir inhabitables. C’est une question de santé humaine.», explique Jacques Baudrier, adjoint PCF au maire de Paris.  © Istock',
        author: 'Florent Le Du',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3833077',
        date: '2026-09-05T12:01:00',
        slug: 'climat-des-premieres-alertes-au-sabotage-des-regulations-par-le-marche-avec-jean-robert-viallet',
        title: 'Climat : des premières alertes au sabotage des régulations par le marché – Avec Jean-Robert Viallet',
        right: false,
        excerpt:
          '<p>Journaliste et réalisateur, Jean-Robert Viallet s’est notamment fait connaître avec « La mise à mort du travail », qui lui a valu le prix Albert Londres en 2010. Après avoir documenté le monde du travail et le narcotrafic, il s’intéresse aujourd’hui aux enjeux environnementaux avec « Fuck La Planète &#8211; Le choix du réchauffement », sa…</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Journaliste et réalisateur, Jean-Robert Viallet s’est notamment fait connaître avec « La mise à mort du travail », qui lui a valu le prix Albert Londres en 2010. Après avoir documenté le monde du travail et le narcotrafic, il s’intéresse aujourd’hui aux enjeux environnementaux avec « Fuck La Planète - Le choix du réchauffement », sa nouvelle série documentaire en trois épisodes. Des premières alertes scientifiques à la mobilisation du marché contre les régulations environnementales, la série revient sur plusieurs décennies de lutte autour du climat.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/Real.webp?w=1200',
        author: 'Grégory Marin',
        article_format: 'video',
        video_cover: 3833080,
        video_url: 'https://youtu.be/ff-F99omZJo',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  articles: {
    opinion: {
      id: '3860965',
      date: '2026-09-21T20:54:34',
      slug: 'en-1970-30-du-patrimoine-des-francais-etait-herite-aujourdhui-cest-70-pourquoi-faut-il-en-finir-avec-notre-societe-dheritiers',
      title:
        '« En 1970, 30 % du patrimoine des Français était hérité. Aujourd’hui, c’est 70 % » : pourquoi faut-il en finir avec notre société d’héritiers ?',
      right: true,
      excerpt:
        '<p>Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n',
      premium: true,
      highlighted: null,
      description:
        '\n\n<p class="chapo">Longtemps taboue, la question de&nbsp;l’héritage, devenue le vecteur principal d’inégalités en France, ressurgit dans le débat public comme marqueur essentiel du clivage&nbsp;gauche-droite. Cécile Duflot, directrice générale d’Oxfam France, Alexandre Ouizille, sénateur PS, et Mélanie Plouviez, philosophe, maîtresse de conférences à l’université Côte-d’Azur, en ont débattu à l’Agora de la&nbsp;Fête de l’Humanité.</p>\n\n',
      image: 'https://www.humanite.fr/wp-content/uploads/2026/09/p4-debat-heritage_MAR.jpg?w=1200',
      image_caption:
        'L’Agora de la Fête de l’Humanité le 13 septembre dernier. Cécile Duflot, Alexandre Ouizille et Mélanie Plouviez y ont débattu de la place de l’héritage en France.',
      author: 'Pierric Marissal',
      article_format: 'opinion',
      content_array: [
        '<p class="wp-block-huma-question">Pourquoi dit-on que la France est devenue une société d’héritiers ?</p><div class="debater-component u-inline-flex u-margin-b-2">\n      <img loading="lazy" decoding="async" width="150" height="150" src="https://www.humanite.fr/wp-content/uploads/2026/09/p4-duflot_MAR.jpg?w=150&h=150&crop=1" class="avatar" alt="">\n    <div class="u-flex-column u-margin-l-1 debater">\n    <p class="t-label-medium debater__name">Cécile Duflot</p>\n    <p class="t-label-small debater__function">directrice générale d’Oxfam France</p>\n  </div>\n</div><p>Il y a cinq ou six ans, quand Oxfam a publié <a href="https://www.humanite.fr/social-et-economie/fiscalite/quelle-fiscalite-juste-pour-lheritage">sa première note sur l’héritage</a>, c’était un sujet quasi tabou. On disait que la France était un pays où les inégalités de revenus après redistribution étaient faibles, mais les inégalités de patrimoine se creusaient. Une enquête de l’Insee a montré que 3,5 % des ménages possèdent plus de la moitié des logements à louer. À salaire égal, une personne logée dans un appartement familial et celle qui doit payer un loyer ne vivent pas la même vie. </p><div class="seealso-component  u-relative u-flex-column u-align-items-center u-margin-b-4 u-margin-t-6 @lg:u-margin-b-8 @lg:u-margin-t-8">\n  <span class="u-absolute u-width-100% t-header-medium t-align-center c-red seealso-component__title">Sur le même thème</span>\n  <div class="seealso-component__content u-flex-column @lg:u-flex-row @lg:u-align-items-start u-justify-content-space-between">\n            <a data-slug="pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche" class="same-theme" href="https://www.humanite.fr/social-et-economie/capital/pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche">\n      <figure class="seealso-component__figure">\n        <img decoding="async" width="300" height="142" src="https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?w=300" class="" alt="" loading="lazy" srcset="https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png 1256w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=300,142 300w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=768,363 768w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=1200,567 1200w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=60,28 60w" sizes="(max-width: 300px) 100vw, 300px">\n                <figcaption class="seealso-component__figcaption">Dans les faits, « 8 Français sur 10 n’hériteront de quasiment rien au cours de leur vie ». De l’autre côté du spectre, l’héritage est devenu le premier moteur d’accumulation.</figcaption>\n              </figure>\n    </a>\n        <div class="u-flex-row u-justify-content-space-between u-width-100% seealso-component__content__text u-align-items-center @lg:u-margin-t-0 u-margin-t-1">\n      <a data-slug="pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche" class="same-theme" href="https://www.humanite.fr/social-et-economie/capital/pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche">\n        <p class="u-margin-b-0 t-article-h3 c-purple">Pourquoi réformer l’héritage est un impératif pour la gauche</p>\n      </a>\n      <a href="https://sso.qiota.com/api/v1/authorize?response_type=code&client_id=64e4a32d7e517&scope=*&redirect_uri=https://www.humanite.fr/connect-success&uri_referer=https://www.humanite.fr/wp-json/wp/v2/posts/3860965&error_uri=https://connexion.humanite.fr?redirect_uri=https://www.humanite.fr/connect-success&referer=3veQL3Ef9t&uri_referer=https://www.humanite.fr/wp-json/wp/v2/posts/3860965" aria-label="Se connecter" class="bm-post c-white bookmark-post" title="Enregistrer pour plus tard">\n    <svg viewbox="0 0 44 44" fill="none">\n      <rect x="0.995307" y="0.663567" width="42.5" height="42.5" rx="21.25" transform="rotate(-0.113465 0.995307 0.663567)" fill="currentColor"></rect>\n      <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5179 12.4623C15.1195 12.465 13.9883 13.7106 13.9913 15.2443L14.0237 31.5989C14.026 32.7569 15.2436 33.4036 16.0731 32.6875L22.5178 27.123C22.9757 26.7277 23.6207 26.7264 24.0801 27.1199L30.5469 32.6588C31.3791 33.3717 32.5942 32.7201 32.5919 31.5621L32.5595 15.2075C32.5564 13.6738 31.4204 12.4328 30.022 12.4355L16.5179 12.4623Z" fill="#F13C47"></path>\n      <ellipse cx="14.9665" cy="14.4194" rx="4.88636" ry="4.88636" transform="rotate(-90.1135 14.9665 14.4194)" fill="#280036"></ellipse>\n      <rect class="outline" x="0.995307" y="0.663567" width="42.5" height="42.5" rx="21.25" transform="rotate(-0.113465 0.995307 0.663567)" stroke="#280036" stroke-width="0.5"></rect>\n    </svg>\n  </a>\n    </div>\n  </div>\n</div><p>Ces inégalités s’accentuent au fil des générations : plus les ménages sont riches, plus ils ont à transmettre, et plus le patrimoine s’accumule. En 1970, 30 % du patrimoine des Français était hérité. Aujourd’hui, c’est presque 70 %. </p><p>À l’autre extrémité, près de huit Français sur dix n’hériteront de quasi rien. Le patrimoine est en grande partie déterminé par le hasard de la naissance. Il suffit, selon la formule d’un milliardaire suédois, de <em>« gagner à la loterie du sperme »</em>.</p><div class="debater-component u-inline-flex u-margin-b-2">\n      <img loading="lazy" decoding="async" width="150" height="150" src="https://www.humanite.fr/wp-content/uploads/2026/09/p4-pouviez_MAR.jpg?w=150&h=150&crop=1" class="avatar" alt="">\n    <div class="u-flex-column u-margin-l-1 debater">\n    <p class="t-label-medium debater__name">Mélanie Plouviez,</p>\n    <p class="t-label-small debater__function">philosophe, maîtresse de conférences à l’université Côte-d’Azur</p>\n  </div>\n</div><p>Nous sommes effectivement redevenus une société d’héritiers. Ce qui est surprenant, c’est que nous n’en avons pas collectivement pris la mesure. L’héritage demeure <a href="https://www.humanite.fr/politique/clemence-guette/un-pacs-ameliore-les-propositions-de-clemence-guette-pour-faire-reconnaitre-legalement-lamitie">perçu comme une question familiale</a> relevant de la sphère intime : une maison, quelques économies. Mais, cumulé, il produit de très fortes inégalités. Quand on parle de société d’héritiers, on pense à la rente et aux privilèges.</p><p>Mais quand on dit « transmettre à ses enfants », on pense à l’amour et à la protection. C’est le même mécanisme, mais son image est tout autre. Un autre argument consiste à présenter l’héritage comme le fruit du travail. Nicolas Sarkozy disait : <em>« Quoi de plus naturel, quand on a travaillé toute sa vie, que de vouloir transmettre à ses enfants ? »</em> Mais on peut considérer le mérite de celui qui a travaillé pour accumuler et s’interroger sur celui <a href="https://www.humanite.fr/social-et-economie/attac-france/levitement-fiscal-demeure-le-sport-favori-des-riches-demontre-un-nouveau-rapport">qui reçoit sans avoir rien fait</a>. Est-ce vraiment récompenser le travail que de laisser jouer cette loterie de la naissance ?</p><p class="wp-block-huma-question">Pourquoi ce débat devient-il particulièrement important aujourd’hui ?</p><p><strong>Mélanie Plouviez :</strong> Nous sommes à la veille de ce que l’on appelle la « grande transmission », avec le décès de la génération du baby-boom et le transfert de son patrimoine vers ses enfants. D’ici à 2040, 9 000 milliards d’euros vont être transmis.</p><p>Est-ce encore une affaire privée ? Il faut prendre la mesure de ce chiffre pour comprendre l<a href="https://www.humanite.fr/vie-quotidienne/heritage/donations-familiales-et-abattements-un-dispositif-qui-profite-surtout-aux-plus-aises">’urgence à penser collectivement l’héritage</a>. Sans cela, la grande transmission sera une grande consolidation des inégalités. Il s’agit de réfléchir démocratiquement à l’usage de ces fonds.</p>\n<!-- … corps tronqué … -->\n<div id="form_don" class="wp-block-group"><div class="wp-block-group__inner-container is-layout-constrained wp-block-group-is-layout-constrained">\n<h2 class="wp-block-heading"><strong>Oui, on s’en doute : vous en avez assez</strong></h2>\n\n\n\n<p>Voir ces messages d’appel au don, ça peut être pénible. Nous le savons. Et on doit bien vous avouer que nous préférerions ne pas avoir à les écrire…</p>\n\n\n\n\n<!-- … bloc de don tronqué … -->',
      ],
      has_audio: false,
      type: 'post',
    },
    video: {
      id: '3861029',
      date: '2026-09-21T16:01:00',
      slug: 'elections-en-allemagne-victoire-de-la-gauche-percee-de-lafd-et-crise-pour-merz',
      title: 'Élections en Allemagne : victoire de la gauche, percée de l’AfD et crise pour Merz',
      right: true,
      excerpt:
        '<p>Au lendemain des élections à Berlin et dans le Land de Mecklembourg-Poméranie-occidentale, qui ont vu dimanche la victoire de la gauche de Die Linke dans la capitale fédérale et une nouvelle percée spectaculaire de l’extrême droite, en tête dans le Land du nord de l’Allemagne, le pays est plongé dans la sidération. Pour le gouvernement du…</p>\n',
      premium: true,
      highlighted: null,
      description:
        '\n\n<p class="chapo">Au lendemain des élections à Berlin et dans le Land de Mecklembourg-Poméranie-occidentale, qui ont vu dimanche la victoire de la gauche de Die Linke dans la capitale fédérale et une nouvelle percée spectaculaire de l’extrême droite, en tête dans le Land du nord de l’Allemagne, le pays est plongé dans la sidération. Pour le gouvernement du chancelier (CDU) Friedrich Merz, les jours semblent comptés.</p>\n\n',
      image: 'https://www.humanite.fr/wp-content/uploads/2026/09/Allemagne-crise.jpg?w=1200',
      author: 'Benjamin König',
      article_format: 'video',
      video_cover: 3861040,
      video_url: 'https://youtu.be/dfZt_ZVhtus',
      content_array: [
        '<div id="form_don" class="wp-block-group"><div class="wp-block-group__inner-container is-layout-constrained wp-block-group-is-layout-constrained">\n<h2 class="wp-block-heading">Face à l’extrême droite, ne rien lâcher !</h2>\n\n\n\n<p>C’est pied à pied, argument contre argument qu’il faut combattre l’extrême droite. Et c’est ce que nous faisons chaque jour dans l’Humanité.</p>\n\n\n\n<p>Face aux attaques in\n<!-- … bloc de don tronqué … -->',
      ],
      has_audio: false,
      type: 'post',
    },
  },
} as const;
