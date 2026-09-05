# Galaxy Duel imagery

## Game background

- File: `galaxy-macs0416.jpg`, 3214 × 3599 pixels; served locally, cropped by CSS to fill the screen.
- Source: https://esahubble.org/images/heic1820b/
- Download: https://cdn.esahubble.org/archives/images/large/heic1820b.jpg
- Credit: NASA, ESA, and M. Montes (University of New South Wales, Sydney, Australia)
- License: CC BY 4.0, https://esahubble.org/copyright/
- The game visibly links the full credit beneath the field. Interactive stars and triangles are game overlays.

## Generated alternate

- File: `galaxy-deep-field-generated.png`, 1672 × 941 pixels.
- Created using the built-in imagegen tool. This is an alternate, not the active background; the Hubble source meets the requested Full HD resolution.
- Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: high-resolution immersive full-screen background for a star-selection strategy game.
Primary request: A realistic telescope deep-field photograph of the universe, like a Hubble galaxy-cluster exposure: almost-black space densely scattered with tiny distant galaxies, pinprick stars, warm golden elliptical galaxies and delicate icy-blue spiral galaxies. A loose diagonal cluster has subtle diffuse pale blue gravitational-lensing-like arcs and scattered soft white galaxy cores. It should feel like looking into the real deep universe.
Style/medium: convincing astronomical photograph with intricate fine detail, restrained natural exposure and excellent sharpness, not a fantasy illustration.
Composition/framing: landscape 16:9, at least 1920x1080, preferably 3840x2160. Detail extends across the entire picture; deep black negative spaces between galaxies. Many tiny galaxies, only a few medium galaxies, no giant foreground planet. Moderate contrast so interactive luminous white stars can be placed over the picture.
Lighting/mood: quiet, vast, mostly black, restrained gold and soft cool blue-white light.
Constraints: image only, no text, labels, UI, lines, triangles, watermark, planets, spacecraft, large saturated nebula clouds, purple fog or graphic gradients.
```

## Webb background

- File: `galaxy-jades.png`, 2000 × 1404 pixels, downloaded unchanged from the user-supplied NASA rendition.
- Source: https://science.nasa.gov/asset/webb/jades-transient-survey-nircam-image/
- Download: https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2024/06/STScI-01HZMFYQ7K9GR4ZA93KYN0EGSJ.png/jcr:content/renditions/Unannotated.png
- Credit: NASA, ESA, CSA, STScI, JADES Collaboration
- Both photographs are selectable during setup, with a live preview. The selected view is stored under `galaxy:background`; the displayed credit follows the selection. CSS dims the background during play for star visibility.
