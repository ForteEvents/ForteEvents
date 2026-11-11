// Pixabay assets are integrated as decoration inside complete, editable invitation designs.
// Pixabay Content License: free commercial use and adaptation; do not redistribute these images standalone.
// Pink roses: https://pixabay.com/photos/roses-pink-arrangement-perfume-3618271/
// White roses: https://pixabay.com/photos/flowers-roses-white-fragrant-4016915/
// Blue hydrangea: https://pixabay.com/photos/flower-hydrangea-blue-nature-2980200/
const PINK_ROSES = 'https://cdn.pixabay.com/photo/2019/05/11/00/52/roses-4194891_1280.png'
const WHITE_ROSES = 'https://cdn.pixabay.com/photo/2019/02/24/02/46/flowers-4016915_1280.png'
const BLUE_HYDRANGEA = 'https://cdn.pixabay.com/photo/2017/11/26/23/07/flower-2980200_1280.png'

export const ECARD_TEMPLATES = [
  { id: 'forte-ivory-gold-rose', name: 'Ivory & Gold Roses', occasion: 'Harusi', style: 'ivory-gold', artwork: WHITE_ROSES, aspectRatio: '5 / 7', photoSlot: false, description: 'Maua halisi meupe, fremu ya dhahabu na mandhari ya ivory.' },
  { id: 'forte-luxury-floral-gold', name: 'Luxury Floral Gold', occasion: 'Harusi', style: 'luxury-floral-gold', artwork: '/ecard-templates/luxury-floral-gold-bg.webp', aspectRatio: '5 / 7', photoSlot: false, description: 'Kadi ya harusi ya kifahari yenye maua, fremu ya dhahabu na mpangilio wa maandishi wa kifahari.' },
  { id: 'forte-blush-rose', name: 'Blush Rose Elegance', occasion: 'Send-off', style: 'blush-rose', artwork: PINK_ROSES, aspectRatio: '5 / 7', photoSlot: false, description: 'Roses za pinki, rangi ya blush na maandishi ya burgundy.' },
  { id: 'forte-blue-rose', name: 'Royal Blue & White Roses', occasion: 'Harusi', style: 'blue-rose', artwork: BLUE_HYDRANGEA, aspectRatio: '5 / 7', photoSlot: true, description: 'Hydrangea za bluu zenye muonekano wa kifahari, royal blue na fremu ya dhahabu.' }
]

const TEMPLATE_ALIASES = {
  'forte-white-gold': 'forte-ivory-gold-rose',
  'forte-cream-blue': 'forte-blue-rose'
}

export function getECardTemplate(templateId) {
  const normalizedId = TEMPLATE_ALIASES[templateId] || templateId
  return ECARD_TEMPLATES.find(template => template.id === normalizedId) || ECARD_TEMPLATES[0]
}
