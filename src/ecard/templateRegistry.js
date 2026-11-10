export const ECARD_TEMPLATES = [
  { id: 'forte-ivory-gold-rose', name: 'Ivory & Gold Roses', occasion: 'Harusi', style: 'ivory-gold', artwork: '/ecard-templates/ivory-gold-roses.svg', aspectRatio: '5 / 7', photoSlot: false },
  { id: 'forte-blush-rose', name: 'Blush Rose Elegance', occasion: 'Send-off', style: 'blush-rose', artwork: '/ecard-templates/blush-rose-elegance.svg', aspectRatio: '5 / 7', photoSlot: false },
  { id: 'forte-blue-rose', name: 'Royal Blue & White Roses', occasion: 'Harusi', style: 'blue-rose', artwork: '/ecard-templates/royal-blue-white-roses.svg', aspectRatio: '5 / 7', photoSlot: true }
]

const TEMPLATE_ALIASES = {
  'forte-white-gold': 'forte-ivory-gold-rose',
  'forte-cream-blue': 'forte-blue-rose'
}

export function getECardTemplate(templateId) {
  const normalizedId = TEMPLATE_ALIASES[templateId] || templateId
  return ECARD_TEMPLATES.find(template => template.id === normalizedId) || ECARD_TEMPLATES[0]
}
