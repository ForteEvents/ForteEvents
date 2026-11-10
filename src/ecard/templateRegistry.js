// Pixabay assets are integrated as decoration inside complete, editable invitation designs.
// Pixabay Content License: free commercial use and adaptation; do not redistribute these images standalone.
// Pink roses: https://pixabay.com/photos/roses-pink-arrangement-perfume-3618271/
// White roses: https://pixabay.com/photos/flowers-roses-white-fragrant-4016915/
const PINK_ROSES = 'https://cdn.pixabay.com/photo/2018/08/20/06/58/roses-3618271_1280.png'
const WHITE_ROSES = 'https://cdn.pixabay.com/photo/2019/02/24/02/46/flowers-4016915_1280.png'

export const ECARD_TEMPLATES = [
  { id: 'forte-ivory-gold-rose', name: 'Ivory & Gold Roses', occasion: 'Harusi', style: 'ivory-gold', artwork: WHITE_ROSES, aspectRatio: '5 / 7', photoSlot: false, description: 'Maua halisi meupe, fremu ya dhahabu na mandhari ya ivory.' },
  { id: 'forte-blush-rose', name: 'Blush Rose Elegance', occasion: 'Send-off', style: 'blush-rose', artwork: PINK_ROSES, aspectRatio: '5 / 7', photoSlot: false, description: 'Roses za pinki, rangi ya blush na maandishi ya burgundy.' },
  { id: 'forte-blue-rose', name: 'Royal Blue & White Roses', occasion: 'Harusi', style: 'blue-rose', artwork: WHITE_ROSES, aspectRatio: '5 / 7', photoSlot: true, description: 'Maua meupe, mapambo ya royal blue na fremu ya dhahabu.' }
]

const TEMPLATE_ALIASES = {
  'forte-white-gold': 'forte-ivory-gold-rose',
  'forte-cream-blue': 'forte-blue-rose'
}

export function getECardTemplate(templateId) {
  const normalizedId = TEMPLATE_ALIASES[templateId] || templateId
  return ECARD_TEMPLATES.find(template => template.id === normalizedId) || ECARD_TEMPLATES[0]
}
