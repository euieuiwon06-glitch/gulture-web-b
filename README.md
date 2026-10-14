# gulture — 시안B (One Body. Many Looks.)

Web version of the gulture 시안B homepage screens, built from the Figma file
(pages "시안B" 1920×1080 / "시안B 1440" 1440×900 / "시안B 2048" 2048×940).

- Live: https://euieuiwon06-glitch.github.io/gulture-web-b/
- All three sizes are in the page; the browser shows the one whose aspect ratio is
  closest to the window and fits it without cropping (portrait screens get the 1440 set
  at full width).
- Navigate with header links / buttons, the round ≡ button (all screens), or ← → keys.
- Buttons, tabs, size pickers, checkboxes, chat inputs, login fields, progress bars,
  front/side/back views and save toggles all respond (`assets/interact.js`).

## Rebuild

```
python tools/build.py
```

`tools/figma/{1440,1920,2048}.json` are the flattened layer exports of each Figma page
(absolute boxes, text styles, photo crops, icons as SVG). Photos are `assets/img/NN.webp`
(2400px, from `gulture_시안B_4K_교체용이미지/final_4k_png`).
