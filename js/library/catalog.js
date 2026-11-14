// Catalogue des morceaux du domaine public (partitions ABC dans music/<id>.abc).

export const COMPOSERS = {
  petzold: { name: 'Christian Petzold', years: '1677–1733', flag: '🇩🇪', country: 'Allemagne' },
  bach: { name: 'Jean-Sébastien Bach', years: '1685–1750', flag: '🇩🇪', country: 'Allemagne' },
  anonyme: { name: 'Anonyme (cahier d’Anna Magdalena Bach)', years: '1725', flag: '🇩🇪', country: 'Allemagne' },
  clementi: { name: 'Muzio Clementi', years: '1752–1832', flag: '🇮🇹', country: 'Italie, puis Angleterre' },
  mozart: { name: 'Wolfgang Amadeus Mozart', years: '1756–1791', flag: '🇦🇹', country: 'Autriche' },
  beethoven: { name: 'Ludwig van Beethoven', years: '1770–1827', flag: '🇩🇪', country: 'Allemagne' },
  burgmuller: { name: 'Friedrich Burgmüller', years: '1806–1874', flag: '🇩🇪', country: 'Allemagne, puis France' },
  chopin: { name: 'Frédéric Chopin', years: '1810–1849', flag: '🇵🇱', country: 'Pologne, puis France' },
  schumann: { name: 'Robert Schumann', years: '1810–1856', flag: '🇩🇪', country: 'Allemagne' },
  liszt: { name: 'Franz Liszt', years: '1811–1886', flag: '🇭🇺', country: 'Hongrie' },
  tchaikovsky: { name: 'Piotr Ilitch Tchaïkovski', years: '1840–1893', flag: '🇷🇺', country: 'Russie' },
  debussy: { name: 'Claude Debussy', years: '1862–1918', flag: '🇫🇷', country: 'France' },
  satie: { name: 'Erik Satie', years: '1866–1925', flag: '🇫🇷', country: 'France' },
};

export const SECTIONS = [
  { id: 'maitres', title: 'Grands compositeurs', emoji: '🎼' },
  { id: 'etudes', title: 'Morceaux d’étude', emoji: '📖' },
  { id: 'miens', title: 'Mes morceaux', emoji: '💾' },
];

// level : difficulté indicative pour les morceaux d'étude (1 à 3).
export const PIECES = [
  // --- Grands compositeurs (ordre chronologique) ---
  { id: 'bach-prelude-c', section: 'maitres', composer: 'bach', title: 'Prélude en do majeur', work: 'BWV 846', year: '1722',
    desc: 'Le tout premier morceau du « Clavier bien tempéré », un recueil de 48 préludes et fugues. Les accords s’égrènent note par note, comme des gouttes d’eau.' },
  { id: 'mozart-k545', section: 'maitres', composer: 'mozart', title: 'Sonate « facile » en do majeur', work: 'K. 545', year: '1788',
    desc: 'Mozart l’a lui-même appelée « petite sonate pour débutants ». Écoute les gammes qui montent et descendent comme des toboggans !' },
  { id: 'mozart-marche-turque', section: 'maitres', composer: 'mozart', title: 'Marche turque', work: 'K. 331', year: '1783',
    desc: 'Mozart imite les fanfares militaires turques, très à la mode à Vienne à son époque. Ça sautille !' },
  { id: 'mozart-petite-musique-de-nuit', section: 'maitres', composer: 'mozart', title: 'Une petite musique de nuit', work: 'K. 525', year: '1787',
    desc: 'Écrite pour un petit orchestre à cordes. Voici le début au piano : c’est l’un des airs les plus connus au monde.' },
  { id: 'beethoven-lettre-a-elise', section: 'maitres', composer: 'beethoven', title: 'Lettre à Élise', work: 'WoO 59', year: '1810',
    desc: 'Beethoven l’a écrite vers 1810, mais elle n’a été retrouvée et publiée qu’en 1867, 40 ans après sa mort. Personne ne sait vraiment qui était Élise !' },
  { id: 'beethoven-clair-de-lune', section: 'maitres', composer: 'beethoven', title: 'Sonate « Clair de lune »', work: 'op. 27 n° 2', year: '1801',
    desc: 'Ce n’est pas Beethoven qui l’a appelée « Clair de lune », mais un poète, qui y entendait la lune se refléter sur un lac.' },
  { id: 'chopin-nocturne-9-2', section: 'maitres', composer: 'chopin', title: 'Nocturne en mi bémol majeur', work: 'op. 9 n° 2', year: '1832',
    desc: 'Un nocturne, c’est une « musique de la nuit ». Chopin avait à peine 20 ans quand il a écrit celui-ci, son plus célèbre.' },
  { id: 'chopin-prelude-4', section: 'maitres', composer: 'chopin', title: 'Prélude en mi mineur', work: 'op. 28 n° 4', year: '1839',
    desc: 'Un prélude doux et triste : la main gauche change ses accords tout doucement, une note à la fois. Il a été joué à l’enterrement de Chopin.' },
  { id: 'chopin-prelude-7', section: 'maitres', composer: 'chopin', title: 'Prélude en la majeur', work: 'op. 28 n° 7', year: '1839',
    desc: 'L’un des 24 préludes de Chopin : il dure moins d’une minute, comme une petite danse polonaise (une mazurka).' },
  { id: 'liszt-reve-d-amour', section: 'maitres', composer: 'liszt', title: 'Rêve d’amour', work: 'Liebestraum n° 3', year: '1850',
    desc: 'Liszt était le pianiste le plus célèbre de son temps, une vraie star ! Ce « Rêve d’amour » était d’abord une chanson.' },
  { id: 'debussy-clair-de-lune', section: 'maitres', composer: 'debussy', title: 'Clair de lune', work: 'Suite bergamasque', year: '1905',
    desc: 'Debussy peint avec les sons, comme les peintres impressionnistes avec la lumière. Ferme les yeux et imagine la lune…' },
  { id: 'satie-gymnopedie-1', section: 'maitres', composer: 'satie', title: 'Gymnopédie n° 1', work: '', year: '1888',
    desc: 'Erik Satie, compositeur français un peu farfelu, a écrit cette musique calme et rêveuse à 22 ans. La main gauche se balance comme un bateau.' },

  // --- Morceaux d'étude (du plus facile au plus difficile) ---
  { id: 'beethoven-ode-joie', section: 'etudes', composer: 'beethoven', title: 'Ode à la joie', work: '9e symphonie', year: '1824', level: 1,
    desc: 'La grande mélodie de la 9e symphonie, devenue l’hymne de l’Europe. Beethoven était déjà complètement sourd quand il l’a écrite !' },
  { id: 'mozart-ah-vous-dirai-je', section: 'etudes', composer: 'mozart', title: 'Ah ! vous dirai-je, maman', work: 'K. 265', year: '1781', level: 1,
    desc: 'Mozart a écrit 12 variations sur cette chanson française. Tu la connais peut-être aussi en anglais : « Twinkle, twinkle, little star ».' },
  { id: 'schumann-melodie', section: 'etudes', composer: 'schumann', title: 'Mélodie', work: 'op. 68 n° 1', year: '1848', level: 1,
    desc: 'Le premier morceau de l’« Album pour la jeunesse », que Schumann a écrit pour ses enfants.' },
  { id: 'petzold-menuet-sol', section: 'etudes', composer: 'petzold', title: 'Menuet en sol majeur', work: 'BWV Anh. 114', year: '1725', level: 2,
    desc: 'On l’a longtemps cru de Bach : il est dans le petit cahier de musique de sa femme, Anna Magdalena. Il a en fait été écrit par Christian Petzold.' },
  { id: 'bach-musette-re', section: 'etudes', composer: 'anonyme', title: 'Musette en ré majeur', work: 'BWV Anh. 126', year: '1725', level: 2, search: 'BWV Anh. 126',
    desc: 'Une musette imite la cornemuse : écoute la basse qui reste sur la même note, comme un bourdon ! On ne sait pas qui l’a écrite : elle est dans le cahier de musique de la famille Bach.' },
  { id: 'schumann-gai-laboureur', section: 'etudes', composer: 'schumann', title: 'Le gai laboureur', work: 'op. 68 n° 10', year: '1848', level: 2,
    desc: 'Le paysan rentre des champs en sifflotant : ici, c’est la main gauche qui joue la mélodie !' },
  { id: 'burgmuller-candeur', section: 'etudes', composer: 'burgmuller', title: 'La candeur', work: 'op. 100 n° 1', year: '1851', level: 2,
    desc: 'La première des « 25 études faciles » de Burgmüller, écrites pour les jeunes pianistes. Elles sont très célèbres au Japon !' },
  { id: 'clementi-sonatine-36-1', section: 'etudes', composer: 'clementi', title: 'Sonatine en do majeur', work: 'op. 36 n° 1', year: '1797', level: 2,
    desc: 'Clementi, pianiste et fabricant de pianos, a écrit ces sonatines pour ses élèves. Les apprentis pianistes les jouent depuis plus de 200 ans !' },
  { id: 'beethoven-sonatine-sol', section: 'etudes', composer: 'beethoven', title: 'Sonatine en sol majeur', work: 'Anh. 5 n° 1', year: '1790', level: 2,
    desc: 'Une petite sonate attribuée à Beethoven, parfaite pour apprendre les phrases musicales.' },
  { id: 'tchaikovsky-vieille-chanson', section: 'etudes', composer: 'tchaikovsky', title: 'Vieille chanson française', work: 'op. 39 n° 16', year: '1878', level: 2,
    desc: 'Tchaïkovski a écrit son « Album pour enfants » en s’inspirant de celui de Schumann. Cette mélodie vient de France !' },
  { id: 'burgmuller-arabesque', section: 'etudes', composer: 'burgmuller', title: 'L’arabesque', work: 'op. 100 n° 2', year: '1851', level: 3,
    desc: 'Une étude pleine d’énergie : les notes tourbillonnent comme une arabesque.' },
];

export const PIECE_BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));

export function imslpUrl(piece) {
  const c = COMPOSERS[piece.composer];
  const q = piece.search || `${piece.work || piece.title} ${c.name.split(' ').pop()}`;
  return `https://imslp.org/index.php?title=Special:Search&search=${encodeURIComponent(q)}`;
}
