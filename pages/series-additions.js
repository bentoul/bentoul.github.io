(() => {
  const image = seed => `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/600`;
  const episode = (seriesKey, number, title, paragraphs) => ({
    id: number,
    title,
    imageUrl: image(`${seriesKey}-episode-${number}`),
    content: paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("")
  });

  window.BENTOUL_ADDITIONAL_SERIES = [
    {
      id: 4,
      title: "Les silences de la maison",
      category: "Drame",
      cover: image("bentoul-silences-cover"),
      description: "Après la maladie de leur mère, trois frères et sœurs doivent apprendre à se parler avant que la maison familiale ne soit vendue.",
      episodes: [
        episode("silences", 1, "La lettre sous la porte", [
          "En rentrant chez elle, Inès trouva une lettre du propriétaire : la maison devait être vendue dans un mois. Malik posa son sac sans enlever son manteau.",
          "<strong>Inès :</strong> « On ne peut pas annoncer ça à maman maintenant. » <strong>Malik :</strong> « Elle mérite de savoir ce qui se passe chez elle. » <strong>Inès :</strong> « Alors on lui dira ensemble. »"
        ]),
        episode("silences", 2, "Le dîner froid", [
          "Le repas réunit enfin Inès, Malik et leur sœur Salomé. Personne ne toucha à son assiette avant que Salomé ne rompe le silence.",
          "<strong>Salomé :</strong> « Vous avez déjà décidé sans moi ? » <strong>Malik :</strong> « On essaie justement de trouver une solution. » <strong>Salomé :</strong> « Une solution, c’est écouter tout le monde. »"
        ]),
        episode("silences", 3, "Les comptes de Malik", [
          "Inès découvrit les factures cachées dans l’atelier. Malik avait payé les médicaments de leur mère en s’endettant.",
          "<strong>Inès :</strong> « Pourquoi tu ne m’as rien dit ? » <strong>Malik :</strong> « Tu avais déjà tout sur les épaules. » <strong>Inès :</strong> « On est une famille, pas trois personnes qui se protègent en se mentant. »"
        ]),
        episode("silences", 4, "Le choix de Salomé", [
          "Salomé annonça qu’elle pouvait revenir vivre quelques semaines à la maison, mais qu’elle ne voulait pas abandonner sa formation.",
          "<strong>Malik :</strong> « On ne te demande pas de renoncer à ta vie. » <strong>Salomé :</strong> « Alors aidez-moi à rester, au lieu de me demander de choisir. » <strong>Inès :</strong> « On cherchera ensemble. »"
        ]),
        episode("silences", 5, "La chambre ouverte", [
          "Leur mère surprit leur conversation et leur demanda de s’asseoir dans sa chambre. Elle leur confia qu’elle aussi avait peur de perdre son indépendance.",
          "<strong>Maman :</strong> « Je ne veux pas devenir un poids. » <strong>Inès :</strong> « Tu es notre mère, pas une dette. » <strong>Malik :</strong> « On va décider avec toi, pas à ta place. »"
        ]),
        episode("silences", 6, "La maison choisie", [
          "Les enfants présentèrent un plan de remboursement et organisèrent la location d’une pièce inutilisée. Leur mère signa l’accord, les yeux brillants.",
          "<strong>Salomé :</strong> « On garde la maison ? » <strong>Maman :</strong> « On garde surtout le droit d’en faire un foyer pour chacun. » <strong>Inès :</strong> « Et cette fois, on se dit tout. »"
        ])
      ]
    },
    {
      id: 5,
      title: "Debout après l’orage",
      category: "Drame",
      cover: image("bentoul-apres-orage-cover"),
      description: "Quand l’atelier de son père ferme après un incendie, Nora rassemble le quartier et découvre que recommencer demande du courage à plusieurs.",
      episodes: [
        episode("orage", 1, "La fumée au matin", [
          "Nora arriva au garage et trouva la porte noire de suie. Son père fixait les outils abîmés sans bouger.",
          "<strong>Nora :</strong> « On va le reconstruire. » <strong>Père :</strong> « Avec quoi ? Il ne reste presque rien. » <strong>Nora :</strong> « Avec les gens que tu as aidés pendant trente ans. »"
        ]),
        episode("orage", 2, "Les mains du quartier", [
          "Le lendemain, les voisins apportèrent des gants, du bois et du café. Samir, l’ancien apprenti, revint après des années d’absence.",
          "<strong>Samir :</strong> « Je ne sais pas si tu veux encore me voir ici. » <strong>Père :</strong> « Je veux savoir si tu es venu travailler. » <strong>Samir :</strong> « Toute la journée. »"
        ]),
        episode("orage", 3, "Ce que Nora cachait", [
          "Nora reçut une proposition de travail dans une autre ville et garda le message pour elle. Sa meilleure amie le remarqua.",
          "<strong>Leïla :</strong> « Tu as peur qu’ils ne s’en sortent pas sans toi ? » <strong>Nora :</strong> « J’ai peur de partir au pire moment. » <strong>Leïla :</strong> « Aider ta famille ne devrait pas effacer ton avenir. »"
        ]),
        episode("orage", 4, "La porte verrouillée", [
          "Une dispute éclata quand le père refusa l’aide de l’assurance et accusa Samir d’avoir abandonné l’atelier autrefois.",
          "<strong>Samir :</strong> « J’avais dix-sept ans et tu ne m’écoutais plus. » <strong>Père :</strong> « Je pensais te protéger. » <strong>Nora :</strong> « Vous pouvez vous expliquer sans vous condamner. »"
        ]),
        episode("orage", 5, "Le premier outil", [
          "Après une nuit de réflexion, le père tendit à Samir la clé du nouveau local. Nora annonça aussi qu’elle avait accepté un entretien à distance.",
          "<strong>Père :</strong> « Tu peux partir et revenir. » <strong>Nora :</strong> « Tu ne m’en voudras pas ? » <strong>Père :</strong> « Je t’en voudrais de ne pas essayer. »"
        ]),
        episode("orage", 6, "Debout ensemble", [
          "Le garage rouvrit dans une salle prêtée par la mairie. Le père, Samir et Nora accueillirent leurs premiers clients autour d’un établi encore neuf.",
          "<strong>Samir :</strong> « Tu crois qu’on tiendra ? » <strong>Père :</strong> « On a déjà tenu jusque-là. » <strong>Nora :</strong> « Et demain, on recommencera. »"
        ])
      ]
    },
    {
      id: 6,
      title: "La dernière promesse",
      category: "Drame",
      cover: image("bentoul-derniere-promesse-cover"),
      description: "Un père malade veut réconcilier ses deux filles, mais chacune porte une version différente du jour où leur famille s’est séparée.",
      episodes: [
        episode("promesse", 1, "Le retour de Jade", [
          "Jade revint au village après huit ans d’absence. Sa sœur Maëlle l’attendait devant l’hôpital, les bras croisés.",
          "<strong>Jade :</strong> « Comment va papa ? » <strong>Maëlle :</strong> « Il demande après toi. » <strong>Jade :</strong> « Et toi ? » <strong>Maëlle :</strong> « Je n’ai pas encore décidé. »"
        ]),
        episode("promesse", 2, "La boîte bleue", [
          "Dans la maison, les sœurs trouvèrent une boîte de lettres jamais envoyées. Toutes portaient le même prénom : Jade.",
          "<strong>Maëlle :</strong> « Il écrivait, mais tu n’as jamais répondu. » <strong>Jade :</strong> « Je n’ai jamais reçu une seule lettre. » <strong>Maëlle :</strong> « Alors qui nous a séparées ? »"
        ]),
        episode("promesse", 3, "La vérité de tante Rose", [
          "Tante Rose reconnut qu’elle avait gardé les lettres pour éviter une dispute entre leur père et Jade.",
          "<strong>Jade :</strong> « Tu as choisi pour nous. » <strong>Rose :</strong> « Je croyais éviter une souffrance. » <strong>Maëlle :</strong> « Tu nous as privées de la vérité. »"
        ]),
        episode("promesse", 4, "Les mots du père", [
          "Leur père leur raconta la dispute qui avait suivi le départ de Jade et reconnut sa propre part de responsabilité.",
          "<strong>Père :</strong> « Je t’ai demandé de rester alors que tu voulais étudier. » <strong>Jade :</strong> « Je pensais que tu ne me pardonnerais jamais. » <strong>Père :</strong> « J’aurais dû te le dire. »"
        ]),
        episode("promesse", 5, "Ce qu’on peut réparer", [
          "Maëlle avoua qu’elle avait gardé rancune parce qu’elle s’était retrouvée seule à prendre soin de leur père.",
          "<strong>Maëlle :</strong> « J’avais besoin que tu sois là. » <strong>Jade :</strong> « Je ne peux pas rendre ces années, mais je peux être là maintenant. » <strong>Maëlle :</strong> « Alors commence par m’écouter. »"
        ]),
        episode("promesse", 6, "Une promesse à trois", [
          "Les trois s’assirent dans le jardin et décidèrent de se partager les visites et les décisions. Leur père leur donna la dernière lettre.",
          "<strong>Père :</strong> « La promesse, ce n’est pas de ne jamais partir. C’est de se parler quand on le fait. » <strong>Jade :</strong> « Je te le promets. » <strong>Maëlle :</strong> « Moi aussi. »"
        ])
      ]
    },
    {
      id: 7,
      title: "Nos dimanches en couleur",
      category: "Romance",
      cover: image("bentoul-dimanches-cover"),
      description: "Une restauratrice de tableaux et un musicien organisent chaque dimanche un marché d’artistes, sans savoir que leur rencontre va repeindre leurs projets.",
      episodes: [
        episode("dimanches", 1, "La toile renversée", [
          "Élise renversa une toile en évitant le vélo de Thomas. Il s’excusa, elle rit, et ils passèrent l’après-midi à nettoyer la peinture.",
          "<strong>Thomas :</strong> « Je peux au moins vous offrir un café. » <strong>Élise :</strong> « Seulement si vous me dites pourquoi vous jouez de la trompette sous la pluie. » <strong>Thomas :</strong> « Pour avoir une bonne raison de rencontrer quelqu’un. »"
        ]),
        episode("dimanches", 2, "Le marché des idées", [
          "Thomas proposa de remplir la place vide chaque dimanche avec des stands d’artisans. Élise dessina un plan sur une serviette.",
          "<strong>Élise :</strong> « Il nous faut une autorisation et des exposants. » <strong>Thomas :</strong> « Et de la musique. » <strong>Élise :</strong> « D’accord, mais pas sous la pluie. »"
        ]),
        episode("dimanches", 3, "Une chanson pour deux", [
          "Après la première répétition, Thomas joua une mélodie qu’il n’avait jamais terminée. Élise y reconnut le rythme de leur rencontre.",
          "<strong>Thomas :</strong> « Tu crois que je devrais la finir ? » <strong>Élise :</strong> « Seulement si tu me laisses choisir la dernière note. » <strong>Thomas :</strong> « Alors elle sera à nous deux. »"
        ]),
        episode("dimanches", 4, "Le jour sans couleur", [
          "Une grosse averse menaça le marché. Élise voulut annuler, mais Thomas avait trouvé un abri dans le vieux passage couvert.",
          "<strong>Élise :</strong> « Personne ne viendra. » <strong>Thomas :</strong> « Regarde derrière toi. » <strong>Élise :</strong> « Ils ont tous apporté leurs parapluies ! » <strong>Thomas :</strong> « La couleur n’a pas besoin de soleil. »"
        ]),
        episode("dimanches", 5, "La proposition de Lyon", [
          "Élise reçut une offre de restauration à Lyon pour trois mois. Elle craignit que Thomas ne le prenne comme un adieu.",
          "<strong>Élise :</strong> « Je veux accepter, mais j’ai peur de nous compliquer la vie. » <strong>Thomas :</strong> « Je préfère une vérité difficile à un regret silencieux. » <strong>Élise :</strong> « Tu m’attendras ? » <strong>Thomas :</strong> « Je viendrai aussi. »"
        ]),
        episode("dimanches", 6, "Le prochain dimanche", [
          "À son retour, Élise découvrit une petite scène installée sur la place. Thomas l’attendait avec leur mélodie enfin terminée.",
          "<strong>Thomas :</strong> « J’ai gardé la dernière note pour toi. » <strong>Élise :</strong> « Et moi, j’ai gardé une place pour toi dans tous mes projets. » <strong>Thomas :</strong> « Alors, on danse ? »"
        ])
      ]
    },
    {
      id: 8,
      title: "Un été à contretemps",
      category: "Romance",
      cover: image("bentoul-contretemps-cover"),
      description: "Au bord de la mer, Anaïs apprend la voile auprès de Sami, qui s’apprête à quitter l’île. Leur été leur demande de choisir sans se retenir.",
      episodes: [
        episode("contretemps", 1, "Le bateau de travers", [
          "Anaïs monta à bord du voilier à l’envers et manqua de tomber. Sami lui tendit la main sans rire, ce qui la fit rire davantage.",
          "<strong>Sami :</strong> « Première règle : écoute le vent. » <strong>Anaïs :</strong> « Et si le vent dit que je dois rentrer ? » <strong>Sami :</strong> « Alors on rentre ensemble. »"
        ]),
        episode("contretemps", 2, "La carte pliée", [
          "En rangeant le cockpit, Anaïs trouva une vieille carte avec une crique marquée au crayon. Sami lui expliqua qu’il y allait enfant.",
          "<strong>Anaïs :</strong> « Tu ne veux pas me montrer ? » <strong>Sami :</strong> « Je pars dans deux semaines. Je n’avais pas prévu de partager mes endroits préférés. » <strong>Anaïs :</strong> « Il n’est pas trop tard pour changer d’avis. »"
        ]),
        episode("contretemps", 3, "La crique secrète", [
          "Ils atteignirent la crique au coucher du soleil. Sami parla enfin de son départ pour poursuivre une formation à Marseille.",
          "<strong>Anaïs :</strong> « Tu as peur de partir ? » <strong>Sami :</strong> « J’ai peur de découvrir que j’aurais pu rester. » <strong>Anaïs :</strong> « Alors pars pour toi, pas pour fuir ce que tu ressens. »"
        ]),
        episode("contretemps", 4, "La tempête annoncée", [
          "Le bulletin météo annonça un orage. Anaïs s’inquiéta quand Sami voulut quand même sortir vérifier les amarres.",
          "<strong>Anaïs :</strong> « Tu n’as pas besoin de prouver que tu n’as peur de rien. » <strong>Sami :</strong> « Et toi, tu n’as pas besoin de faire comme si tu n’avais pas peur que je parte. » <strong>Anaïs :</strong> « C’est vrai. »"
        ]),
        episode("contretemps", 5, "Le dernier départ", [
          "La veille du train, ils se retrouvèrent sur le quai. Anaïs avait une lettre dans la poche et Sami une photo de la crique.",
          "<strong>Sami :</strong> « Tu veux que je reste ? » <strong>Anaïs :</strong> « Je veux que tu sois heureux. Et je veux qu’on essaie, même à distance. » <strong>Sami :</strong> « Alors on essaie vraiment. »"
        ]),
        episode("contretemps", 6, "L’horaire des marées", [
          "À la fin de l’été, Sami revint pour un week-end. Anaïs l’attendait au port avec une nouvelle carte et deux billets pour la crique.",
          "<strong>Anaïs :</strong> « Tu as appris à vivre en ville ? » <strong>Sami :</strong> « J’apprends. Et toi ? » <strong>Anaïs :</strong> « J’apprends à ne pas compter les jours, mais les retrouvailles. »"
        ])
      ]
    },
    {
      id: 9,
      title: "La distance entre nous",
      category: "Romance",
      cover: image("bentoul-distance-cover"),
      description: "Mina, architecte, et Jules, infirmier de nuit, se croisent dans un immeuble en rénovation et inventent leur propre façon de se retrouver.",
      episodes: [
        episode("distance", 1, "Le voisin de minuit", [
          "Mina dessinait dans le hall à minuit quand Jules rentra de sa garde. Il s’arrêta devant son plan, intrigué.",
          "<strong>Jules :</strong> « Vous dessinez un immeuble ou une ville entière ? » <strong>Mina :</strong> « Ça dépend de combien de temps vous restez. » <strong>Jules :</strong> « Je peux repasser demain. »"
        ]),
        episode("distance", 2, "Deux horaires", [
          "Ils laissèrent des petits mots sur le tableau de l’entrée : Mina partait au travail quand Jules dormait, et inversement.",
          "<strong>Mina, sur un mot :</strong> « Café jeudi à 7 h ? » <strong>Jules, en réponse :</strong> « Si vous acceptez que je sois encore à moitié endormi. » <strong>Mina :</strong> « C’est déjà le cas quand je dessine. »"
        ]),
        episode("distance", 3, "La fenêtre condamnée", [
          "Jules remarqua que Mina avait cessé de venir dans le hall. Une fenêtre du chantier avait été condamnée et son appartement allait perdre sa lumière.",
          "<strong>Jules :</strong> « Tu peux encore modifier le plan ? » <strong>Mina :</strong> « Pas sans convaincre le propriétaire. » <strong>Jules :</strong> « Alors tu ne vas pas le convaincre seule. »"
        ]),
        episode("distance", 4, "La réunion du mardi", [
          "Les habitants se réunirent pour défendre la fenêtre. Mina présenta un nouveau plan et Jules expliqua ce que la lumière changeait pour les résidents âgés.",
          "<strong>Propriétaire :</strong> « Ça coûtera plus cher. » <strong>Mina :</strong> « Mais ça préservera un espace vivable. » <strong>Jules :</strong> « Et nous pouvons vous aider à trouver un financement. »"
        ]),
        episode("distance", 5, "Le message oublié", [
          "Mina partit sur un chantier à l’étranger pour deux semaines. Jules manqua son appel après une nuit difficile et craignit qu’elle pense qu’il s’éloignait.",
          "<strong>Jules :</strong> « Je n’ai pas répondu, mais je pensais à toi. » <strong>Mina :</strong> « Tu n’as pas à être disponible chaque minute. Dis-moi juste quand tu peux parler. » <strong>Jules :</strong> « Ce soir, si tu veux. »"
        ]),
        episode("distance", 6, "La lumière retrouvée", [
          "La fenêtre fut conservée. Mina revint avec une maquette de l’immeuble achevé et Jules l’attendait près du tableau couvert de leurs mots.",
          "<strong>Jules :</strong> « On a enfin le même jour de congé. » <strong>Mina :</strong> « On devrait en profiter avant que le destin change nos horaires. » <strong>Jules :</strong> « Ou construire un rythme à nous. »"
        ])
      ]
    },
    {
      id: 10,
      title: "Le dossier des absents",
      category: "Mystère",
      cover: image("bentoul-dossier-absents-cover"),
      description: "Dans les archives de la mairie, Yara trouve des fiches de personnes introuvables et suit une piste que quelqu’un tente d’effacer.",
      episodes: [
        episode("absents", 1, "La fiche sans nom", [
          "Yara découvrit un dossier daté de vingt ans : plusieurs habitants avaient disparu des registres le même jour. Le gardien lui demanda de le refermer.",
          "<strong>Yara :</strong> « Pourquoi ces noms ont-ils été rayés ? » <strong>Gardien :</strong> « Parce que certaines questions font du mal. » <strong>Yara :</strong> « Le silence aussi. »"
        ]),
        episode("absents", 2, "La photographie floue", [
          "Une photographie du dossier montrait une porte condamnée derrière l’ancienne gare. Son collègue Nabil reconnut la façade.",
          "<strong>Nabil :</strong> « Mon grand-père parlait d’une salle d’attente qui n’existait sur aucun plan. » <strong>Yara :</strong> « Tu veux qu’on y aille ? » <strong>Nabil :</strong> « Oui, mais pas sans prévenir quelqu’un. »"
        ]),
        episode("absents", 3, "Le témoin du quai", [
          "Madame Bensaïd, ancienne employée de gare, accepta de leur parler à condition qu’ils cessent de prendre des notes.",
          "<strong>Madame Bensaïd :</strong> « Ils n’ont pas disparu. Ils sont partis après l’inondation. » <strong>Yara :</strong> « Pourquoi les registres disent le contraire ? » <strong>Madame Bensaïd :</strong> « Parce qu’on leur a demandé de partir sans faire de bruit. »"
        ]),
        episode("absents", 4, "La porte de service", [
          "Dans la salle oubliée, Yara trouva des lettres d’habitants réclamant une aide qui ne leur était jamais parvenue. Un bruit retentit dans le couloir.",
          "<strong>Nabil :</strong> « Quelqu’un est là. » <strong>Yara :</strong> « Cache les lettres, je vais voir. » <strong>Nabil :</strong> « Non, on reste ensemble. »"
        ]),
        episode("absents", 5, "Le nom du responsable", [
          "Le nouveau maire confirma qu’un ancien responsable avait falsifié les dossiers pour cacher le détournement d’une aide d’urgence.",
          "<strong>Maire :</strong> « Je ne peux pas effacer ce qui a été fait. » <strong>Yara :</strong> « Mais vous pouvez rendre les noms à ceux qu’on a oubliés. » <strong>Maire :</strong> « Publiez les preuves. Je répondrai de la suite. »"
        ]),
        episode("absents", 6, "Ceux qui reviennent", [
          "Les lettres retrouvèrent leurs destinataires. Quelques familles revinrent au village pour raconter leur histoire sur la place publique.",
          "<strong>Madame Bensaïd :</strong> « On nous a enfin demandé ce qui s’était passé. » <strong>Yara :</strong> « Et qu’allez-vous leur répondre ? » <strong>Madame Bensaïd :</strong> « La vérité, cette fois. »"
        ])
      ]
    },
    {
      id: 11,
      title: "Le phare au bout du monde",
      category: "Aventure",
      cover: image("bentoul-phare-cover"),
      description: "Deux amis partent réparer un phare isolé avant la saison des tempêtes et découvrent une carte menant à un ancien refuge côtier.",
      episodes: [
        episode("phare", 1, "La traversée", [
          "Nina et Élias embarquèrent avant l’aube. La mer était calme, mais une carte ancienne dépassait du sac d’Élias.",
          "<strong>Nina :</strong> « Tu m’avais dit qu’on allait réparer une lampe. » <strong>Élias :</strong> « C’est bien le plan. » <strong>Nina :</strong> « Et la carte ? » <strong>Élias :</strong> « Une histoire pour le retour. »"
        ]),
        episode("phare", 2, "La lumière éteinte", [
          "Le phare était intact, mais son mécanisme avait été démonté. Nina inspecta les engrenages pendant qu’Élias cherchait l’ancien gardien.",
          "<strong>Nina :</strong> « Quelqu’un a emporté une pièce. » <strong>Élias :</strong> « L’ancien gardien dit qu’elle est dans le refuge. » <strong>Nina :</strong> « Alors on trouve le refuge avant la prochaine marée. »"
        ]),
        episode("phare", 3, "Le sentier rouge", [
          "La carte conduisit les amis jusqu’à un sentier marqué d’une peinture rouge. Le vent arracha le papier des mains d’Élias.",
          "<strong>Élias :</strong> « Je vais le récupérer ! » <strong>Nina :</strong> « Pas sur cette pente. La carte ne vaut pas ta vie. » <strong>Élias :</strong> « Tu as raison. On cherchera un autre passage. »"
        ]),
        episode("phare", 4, "La grotte des marées", [
          "Ils trouvèrent une entrée de grotte dissimulée sous les rochers. Une cloche indiquait le niveau de la marée sur la paroi.",
          "<strong>Nina :</strong> « On a vingt minutes avant que le passage se ferme. » <strong>Élias :</strong> « Tu prends la lampe, je porte les outils. » <strong>Nina :</strong> « Et si l’eau monte, on fait demi-tour sans discuter. »"
        ]),
        episode("phare", 5, "Le journal du gardien", [
          "Dans le refuge, ils découvrirent la pièce manquante et le journal d’une gardienne qui avait abrité des marins pendant une tempête.",
          "<strong>Élias :</strong> « Elle a gardé ce phare allumé toute seule. » <strong>Nina :</strong> « Non. Lis la dernière page : les pêcheurs venaient l’aider. » <strong>Élias :</strong> « Alors nous aussi, on demandera de l’aide. »"
        ]),
        episode("phare", 6, "La côte en vue", [
          "Les habitants aidèrent Nina et Élias à remettre le phare en marche. Sa lumière traversa la brume juste avant l’arrivée d’un bateau de pêche.",
          "<strong>Nina :</strong> « Tu raconteras enfin l’histoire de la carte ? » <strong>Élias :</strong> « Quand on sera rentrés. » <strong>Nina :</strong> « Cette fois, je garde la carte. »"
        ])
      ]
    },
    {
      id: 12,
      title: "L’atelier des étoiles",
      category: "Fantastique",
      cover: image("bentoul-atelier-etoiles-cover"),
      description: "Dans l’atelier de sa grand-mère, Sami découvre des étoiles miniatures capables de révéler les souvenirs qu’on n’ose pas raconter.",
      episodes: [
        episode("etoiles", 1, "La boîte de verre", [
          "Sami ouvrit une boîte de verre oubliée dans le grenier. Une minuscule étoile s’alluma dans sa paume et projeta une image de sa grand-mère enfant.",
          "<strong>Sami :</strong> « Comment c’est possible ? » <strong>Grand-mère :</strong> « Les étoiles gardent les souvenirs confiés avec courage. » <strong>Sami :</strong> « Et si je n’ai rien à leur confier ? » <strong>Grand-mère :</strong> « Tu peux commencer par une question. »"
        ]),
        episode("etoiles", 2, "Le souvenir de la mer", [
          "La première étoile montra une plage et un garçon qui ressemblait au père de Sami. Grand-mère détourna les yeux.",
          "<strong>Sami :</strong> « C’est papa ? » <strong>Grand-mère :</strong> « Oui. Il voulait devenir marin. » <strong>Sami :</strong> « Pourquoi il n’en parle jamais ? » <strong>Grand-mère :</strong> « Parce qu’il croit avoir déçu tout le monde. »"
        ]),
        episode("etoiles", 3, "La lumière partagée", [
          "Sami apporta l’étoile à son père. La projection révéla le jour où celui-ci avait renoncé à son voyage pour aider sa famille.",
          "<strong>Père :</strong> « Je ne voulais pas que tu voies mes regrets. » <strong>Sami :</strong> « Je vois surtout tout ce que tu as fait pour nous. » <strong>Père :</strong> « J’aurais aimé que tu saches aussi qui j’étais. »"
        ]),
        episode("etoiles", 4, "L’étoile sombre", [
          "Une étoile noire apparut au fond de la boîte. La grand-mère expliqua qu’elle contenait un souvenir qu’elle n’avait jamais osé partager.",
          "<strong>Grand-mère :</strong> « J’ai fermé l’atelier après la disparition de ta tante. » <strong>Sami :</strong> « Elle n’a pas disparu, elle est partie ? » <strong>Grand-mère :</strong> « Je ne sais même plus ce que je lui ai dit avant son départ. »"
        ]),
        episode("etoiles", 5, "La lettre qui manque", [
          "Dans le tiroir de l’établi, Sami trouva une lettre inachevée destinée à sa tante. Son père proposa de la retrouver avec lui.",
          "<strong>Père :</strong> « Tu veux vraiment rouvrir cette histoire ? » <strong>Sami :</strong> « Je veux lui laisser la chance de nous répondre. » <strong>Grand-mère :</strong> « Alors écrivez-lui tous les deux. »"
        ]),
        episode("etoiles", 6, "Le ciel de la maison", [
          "La tante arriva à l’atelier avec une lettre de réponse et un souvenir à ajouter à la boîte. Les étoiles brillèrent au-dessus de la table.",
          "<strong>Tante :</strong> « Je n’attendais pas que vous soyez parfaits. Je voulais juste que vous m’appeliez. » <strong>Grand-mère :</strong> « J’aurais dû le faire. » <strong>Sami :</strong> « On peut commencer maintenant. »"
        ])
      ]
    }
  ];
})();
