/**
 * Real answers from the journal's service, kept so a schema is held against what the service actually sends rather
 * than against what we remember of it. Captured from the official app on 2026-09-21 and never edited by hand.
 *
 * Article bodies are trimmed: the opening of the prose and the whole donation block the service closes every article
 * with, nothing between. The block is what a conversion has to recognise and cut, so it is kept whole; the prose is
 * the journal's to publish, so only enough of it is kept to read a structure. Nothing here is served to a reader.
 *
 * What this set does NOT hold, and what no check can therefore see: the body of a `classic` article. The capture
 * opened two videos and one opinion, and `classic` is 320 of the 464 items it carries.
 */
/** The key the service names its section list with; a string, so no identifier of this repo is spelled in French. */
const SECTIONS_KEY = 'rubriques';

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
      {
        id: '3855699',
        date: '2026-09-20T12:01:00',
        slug: 'house-politique-et-lutte-des-classes-rencontre-avec-folamour-fete-de-lhumanite-2026',
        title: 'House, politique et lutte des classes : rencontre avec Folamour – Fête de l&#8217;Humanité 2026',
        right: true,
        excerpt:
          '<p>Premiers chocs politiques en 2002 et 2006, racines contestataires des dancefloors américains, lutte contre la marchandisation de la fête et enjeux de la présidentielle 2027 : on discute avec l&#8217;artiste Folamour, en direct de la Fête de l&#8217;Humanité.</p>\n',
        premium: false,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Premiers chocs politiques en 2002 et 2006, racines contestataires des dancefloors américains, lutte contre la marchandisation de la fête et enjeux de la présidentielle 2027 : on discute avec l\'artiste Folamour, en direct de la Fête de l\'Humanité.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/09/Folamour-v.webp?w=1200',
        author: 'Mathilde Gros',
        article_format: 'video',
        video_cover: 3855705,
        video_url: 'https://youtu.be/I4pafegd0oo',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  search: {
    success: true,
    posts: [
      {
        id: '3716753',
        date: '2026-06-19T15:32:21',
        slug: 'absurdites-economiques-et-rechauffement-climatique',
        title: 'Absurdités économiques et réchauffement climatique',
        right: false,
        excerpt:
          '<p>Gérard Le Puill A force de fixer à la baisse les prix des produits payés à nos paysans dès que l’offre mondiale dépasse la demande, la production française diminue au fil des ans. Parallèlement, la concurrence entre pays membres de l’Union européenne, en plus de celle des pays tiers bénéficiant d’accords de libre-échange avec l’Union européenne,…</p>\n',
        premium: true,
        highlighted: null,
        description: '\n\n<p class="chapo"></p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/06/Vignette_2024_tribune_97bbf4_0d10fc.webp?w=1023',
        author: 'Gérard Le Puill',
        article_format: 'opinion',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3700906',
        date: '2026-06-11T18:48:51',
        slug: '15-degre-des-2030-alerte-rouge',
        title: '+ 1,5 degré dès 2030 : alerte rouge',
        right: true,
        excerpt:
          '<p>Le thermomètre s’emballe, et certains s’acharnent à le casser. Avec leur dernière mise à jour des indicateurs climatiques, plus de 70 scientifiques de 17 pays tirent un sérieux signal d’alarme : le rythme du réchauffement s’accélère dangereusement. Après le seuil de + 1,39 °C par rapport à l’ère préindustrielle franchi en 2025, la ligne rouge fixée à + 1,5 °C par l’accord de…</p>\n',
        premium: false,
        highlighted: null,
        description: '\n\n<p class="chapo"></p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2024/02/Vignette_2024_editorial_rosa.png?w=1200',
        author: 'Rosa Moussaoui',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
      {
        id: '3732367',
        date: '2026-06-28T18:15:48',
        slug: 'canicule-linaction-climatique-revient-a-trier-ceux-qui-survivront-et-ceux-qui-mourront-analyse-la-geographe-magali-reghezza-zitt',
        title:
          'Canicule : « L’inaction climatique revient à trier ceux qui survivront et ceux qui mourront », prévient la géographe Magali Reghezza-Zitt',
        right: false,
        excerpt:
          '<p>Alors que nous sortons doucement d’un épisode caniculaire&nbsp;sans précédent, à l’origine d’au moins un millier de morts, la géographe Magali Reghezza-Zitt assure que le réchauffement climatique peut&nbsp;encore&nbsp;être stoppé, à condition de changer&nbsp;nos modes de vie en&nbsp;amorçant&nbsp;le virage de la neutralité carbone.</p>\n',
        premium: true,
        highlighted: null,
        description:
          '\n\n<p class="chapo">Alors que nous sortons doucement d’un épisode caniculaire&nbsp;sans précédent, à l’origine d’au moins un millier de morts, la géographe Magali Reghezza-Zitt assure que le réchauffement climatique peut&nbsp;encore&nbsp;être stoppé, à condition de changer&nbsp;nos modes de vie en&nbsp;amorçant&nbsp;le virage de la neutralité carbone.</p>\n\n',
        image: 'https://www.humanite.fr/wp-content/uploads/2026/06/p2-canicule_LUN.jpg?w=1200',
        image_caption:
          ' « Ce qui se passe aujourd’hui, c’est de l’enfumage. On transfère sur les individus la responsabilité morale de l’inaction », estime Magali Reghezza-Zitt. © Gauthier Bedrignans / Hans Lucas via AFP',
        author: 'Alexandra Chaignon',
        article_format: 'classic',
        has_audio: false,
        type: 'post',
      },
    ],
  },
  opinionArticle: {
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
      '<p class="wp-block-huma-question">Pourquoi dit-on que la France est devenue une société d’héritiers ?</p><div class="debater-component u-inline-flex u-margin-b-2">\n      <img loading="lazy" decoding="async" width="150" height="150" src="https://www.humanite.fr/wp-content/uploads/2026/09/p4-duflot_MAR.jpg?w=150&h=150&crop=1" class="avatar" alt="">\n    <div class="u-flex-column u-margin-l-1 debater">\n    <p class="t-label-medium debater__name">Cécile Duflot</p>\n    <p class="t-label-small debater__function">directrice générale d’Oxfam France</p>\n  </div>\n</div><p>Il y a cinq ou six ans, quand Oxfam a publié <a href="https://www.humanite.fr/social-et-economie/fiscalite/quelle-fiscalite-juste-pour-lheritage">sa première note sur l’héritage</a>, c’était un sujet quasi tabou. On disait que la France était un pays où les inégalités de revenus après redistribution étaient faibles, mais les inégalités de patrimoine se creusaient. Une enquête de l’Insee a montré que 3,5 % des ménages possèdent plus de la moitié des logements à louer. À salaire égal, une personne logée dans un appartement familial et celle qui doit payer un loyer ne vivent pas la même vie. </p><div class="seealso-component  u-relative u-flex-column u-align-items-center u-margin-b-4 u-margin-t-6 @lg:u-margin-b-8 @lg:u-margin-t-8">\n  <span class="u-absolute u-width-100% t-header-medium t-align-center c-red seealso-component__title">Sur le même thème</span>\n  <div class="seealso-component__content u-flex-column @lg:u-flex-row @lg:u-align-items-start u-justify-content-space-between">\n            <a data-slug="pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche" class="same-theme" href="https://www.humanite.fr/social-et-economie/capital/pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche">\n      <figure class="seealso-component__figure">\n        <img decoding="async" width="300" height="142" src="https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?w=300" class="" alt="" loading="lazy" srcset="https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png 1256w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=300,142 300w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=768,363 768w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=1200,567 1200w, https://www.humanite.fr/wp-content/uploads/2026/09/Capture-decran-2026-09-13-171817.png?resize=60,28 60w" sizes="(max-width: 300px) 100vw, 300px">\n                <figcaption class="seealso-component__figcaption">Dans les faits, « 8 Français sur 10 n’hériteront de quasiment rien au cours de leur vie ». De l’autre côté du spectre, l’héritage est devenu le premier moteur d’accumulation.</figcaption>\n              </figure>\n    </a>\n        <div class="u-flex-row u-justify-content-space-between u-width-100% seealso-component__content__text u-align-items-center @lg:u-margin-t-0 u-margin-t-1">\n      <a data-slug="pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche" class="same-theme" href="https://www.humanite.fr/social-et-economie/capital/pourquoi-reformer-lheritage-est-un-imperatif-pour-la-gauche">\n        <p class="u-margin-b-0 t-article-h3 c-purple">Pourquoi réformer l’héritage est un impératif pour la gauche</p>\n      </a>\n      <a href="https://sso.qiota.com/api/v1/authorize?response_type=code&client_id=64e4a32d7e517&scope=*&redirect_uri=https://www.humanite.fr/connect-success&uri_referer=https://www.humanite.fr/wp-json/wp/v2/posts/3860965&error_uri=https://connexion.humanite.fr?redirect_uri=https://www.humanite.fr/connect-success&referer=3veQL3Ef9t&uri_referer=https://www.humanite.fr/wp-json/wp/v2/posts/3860965" aria-label="Se connecter" class="bm-post c-white bookmark-post" title="Enregistrer pour plus tard">\n    <svg viewbox="0 0 44 44" fill="none">\n      <rect x="0.995307" y="0.663567" width="42.5" height="42.5" rx="21.25" transform="rotate(-0.113465 0.995307 0.663567)" fill="currentColor"></rect>\n      <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5179 12.4623C15.1195 12.465 13.9883 13.7106 13.9913 15.2443L14.0237 31.5989C14.026 32.7569 15.2436 33.4036 16.0731 32.6875L22.5178 27.123C22.9757 26.7277 23.6207 26.7264 24.0801 27.1199L30.5469 32.6588C31.3791 33.3717 32.5942 32.7201 32.5919 31.5621L32.5595 15.2075C32.5564 13.6738 31.4204 12.4328 30.022 12.4355L16.5179 12.4623Z" fill="#F13C47"></path>\n      <ellipse cx="14.9665" cy="14.4194" rx="4.88636" ry="4.88636" transform="rotate(-90.1135 14.9665 14.4194)" fill="#280036"></ellipse>\n      <rect class="outline" x="0.995307" y="0.663567" width="42.5" height="42.5" rx="21.25" transform="rotate(-0.113465 0.995307 0.663567)" stroke="#280036" stroke-width="0.5"></rect>\n    </svg>\n  </a>\n    </div>\n  </div>\n</div><p>Ces inégalités s’accentuent au fil des générations : plus les ménages sont riches, plus ils ont à transmettre, et plus le patrimoine s’accumule. En 1970, 30 % du patrimoine des Français était hérité. Aujourd’hui, c’est presque 70 %. </p><p>À l’autre extrémité, près de huit Français sur dix n’hériteront de quasi rien. Le patrimoine est en grande partie déterminé par le hasard de la naissance. Il suffit, selon la formule d’un milliardaire suédois, de <em>« gagner à la loterie du sperme »</em>.</p><div class="debater-component u-inline-flex u-margin-b-2">\n      <img loading="lazy" decoding="async" width="150" height="150" src="https://www.humanite.fr/wp-content/uploads/2026/09/p4-pouviez_MAR.jpg?w=150&h=150&crop=1" class="avatar" alt="">\n    <div class="u-flex-column u-margin-l-1 debater">\n    <p class="t-label-medium debater__name">Mélanie Plouviez,</p>\n    <p class="t-label-small debater__function">philosophe, maîtresse de conférences à l’université Côte-d’Azur</p>\n  </div>\n</div><p>Nous sommes effectivement redevenus une société d’héritiers. Ce qui est surprenant, c’est que nous n’en avons pas collectivement pris la mesure. L’héritage demeure <a href="https://www.humanite.fr/politique/clemence-guette/un-pacs-ameliore-les-propositions-de-clemence-guette-pour-faire-reconnaitre-legalement-lamitie">perçu comme une question familiale</a> relevant de la sphère intime : une maison, quelques économies. Mais, cumulé, il produit de très fortes inégalités. Quand on parle de société d’héritiers, on pense à la rente et aux privilèges.</p><p>Mais quand on dit « transmettre à ses enfants », on pense à l’amour et à la protection. C’est le même mécanisme, mais son image est tout autre. Un autre argument consiste à présenter l’héritage comme le fruit du travail. Nicolas Sarkozy disait : <em>« Quoi de plus naturel, quand on a travaillé toute sa vie, que de vouloir transmettre à ses enfants ? »</em> Mais on peut considérer le mérite de celui qui a travaillé pour accumuler et s’interroger sur celui <a href="https://www.humanite.fr/social-et-economie/attac-france/levitement-fiscal-demeure-le-sport-favori-des-riches-demontre-un-nouveau-rapport">qui reçoit sans avoir rien fait</a>. Est-ce vraiment récompenser le travail que de laisser jouer cette loterie de la naissance ?</p><p class="wp-block-huma-question">Pourquoi ce débat devient-il particulièrement important aujourd’hui ?</p><p><strong>Mélanie Plouviez :</strong> Nous sommes à la veille de ce que l’on appelle la « grande transmission », avec le décès de la génération du baby-boom et le transfert de son patrimoine vers ses enfants. D’ici à 2040, 9 000 milliards d’euros vont être transmis.</p><p>Est-ce encore une affaire privée ? Il faut prendre la mesure de ce chiffre pour comprendre l<a href="https://www.humanite.fr/vie-quotidienne/heritage/donations-familiales-et-abattements-un-dispositif-qui-profite-surtout-aux-plus-aises">’urgence à penser collectivement l’héritage</a>. Sans cela, la grande transmission sera une grande consolidation des inégalités. Il s’agit de réfléchir démocratiquement à l’usage de ces fonds.</p>\n<!-- … corps tronqué pour le dépôt … -->\n<div id="form_don" class="wp-block-group"><div class="wp-block-group__inner-container is-layout-constrained wp-block-group-is-layout-constrained">\n<h2 class="wp-block-heading"><strong>Oui, on s’en doute : vous en avez assez</strong></h2>\n\n\n\n<p>Voir ces messages d’appel au don, ça peut être pénible. Nous le savons. Et on doit bien vous avouer que nous préférerions ne pas avoir à les écrire…</p>\n\n\n\n\n<!-- … bloc de don tronqué … -->',
    ],
    has_audio: false,
    type: 'post',
  },
  videoArticle: {
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
} as const;
