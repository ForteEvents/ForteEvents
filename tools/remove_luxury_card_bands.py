from PIL import Image
import cv2
import numpy as np

path = "public/ecard-templates/luxury-floral-gold-bg.webp"
image = Image.open(path).convert("RGB")
rgb = np.array(image)
h, w = rgb.shape[:2]

# The two printed decorative bars occupy only the open center panel.
# Coordinates are proportional so the edit remains correct if the source is resized.
mask = np.zeros((h, w), dtype=np.uint8)
def rect(x1, y1, x2, y2):
    cv2.rectangle(mask, (round(x1*w), round(y1*h)), (round(x2*w), round(y2*h)), 255, -1)

rect(0.225, 0.345, 0.785, 0.395)  # gold strip
rect(0.245, 0.445, 0.765, 0.505)  # burgundy strip

# Inpaint from the surrounding ivory paper texture; all flowers and frame remain untouched.
bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
clean = cv2.inpaint(bgr, mask, 9, cv2.INPAINT_TELEA)
out = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
out.save(path, "WEBP", quality=96, method=6)
print(f"Cleaned two printed strips in {path} ({w}x{h})")
