const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ" +
  " !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿" +
  "abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM_EXTENDED = "^{}\\[~]|€\f";

export function countSmsParts(message) {
  const text = String(message ?? "");

  if (!text.length) {
    return 0;
  }

  let gsmUnits = 0;
  let isGsm = true;

  for (const character of text) {
    if (GSM_BASIC.includes(character)) {
      gsmUnits += 1;
    } else if (GSM_EXTENDED.includes(character)) {
      gsmUnits += 2;
    } else {
      isGsm = false;
      break;
    }
  }

  if (isGsm) {
    return gsmUnits <= 160
      ? 1
      : Math.ceil(gsmUnits / 153);
  }

  const unicodeUnits = text.length;

  return unicodeUnits <= 70
    ? 1
    : Math.ceil(unicodeUnits / 67);
}
