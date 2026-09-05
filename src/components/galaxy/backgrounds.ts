export const GALAXY_BACKGROUNDS = [
  {
    id: 'hubble',
    name: 'Hubble · Galaxy cluster',
    image: '/images/galaxy-macs0416.jpg',
    source: 'https://esahubble.org/images/heic1820b/',
    credit: 'NASA, ESA, and M. Montes (University of New South Wales, Sydney, Australia)',
  },
  {
    id: 'webb',
    name: 'Webb · JADES deep field',
    image: '/images/galaxy-jades.png',
    source: 'https://science.nasa.gov/asset/webb/jades-transient-survey-nircam-image/',
    credit: 'NASA, ESA, CSA, STScI, JADES Collaboration',
  },
] as const;
export type GalaxyBackgroundId = (typeof GALAXY_BACKGROUNDS)[number]['id'];
export const BACKGROUND_STORAGE_KEY = 'galaxy:background';
export function readBackground(): GalaxyBackgroundId {
  try {
    return localStorage.getItem(BACKGROUND_STORAGE_KEY) === 'webb' ? 'webb' : 'hubble';
  } catch {
    return 'hubble';
  }
}
