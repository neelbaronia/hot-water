# Where does hot water come from?

A one-minute animated explainer: what happens between turning the hot tap and hot water coming out.

- **Where it comes from:** a tank water heater, usually in the basement.
- **How it stays hot:** foam insulation, plus a thermostat that fires the burner when the water cools.
- **How it gets up the pipe:** city water pressure pushes cold water into the bottom of the tank, which pushes hot water out the top.
- **How the tap works:** turning the handle unscrews a stem and lifts a rubber washer off the valve seat.
- **Why you wait:** water left sitting in the pipe has gone cold and has to be flushed out first.

Rendered videos are in `out/`: `hot-water-textbook.mp4` (mid-century textbook style) and `hot-water.mp4` (the original flat style).

## How it works

`index.html` is the whole animation: one SVG scene and a `render(t)` function that draws any moment of the 59-second timeline. Open it in a browser to play it live (click to pause).

Styles are switched with a query parameter:

| URL | Style |
| --- | --- |
| `index.html` | flat, original |
| `index.html?style=textbook` | mid-century textbook |
| `index.html?style=blueprint` | blueprint (rough) |
| `index.html?style=comic` | pop-art comic |

## Rendering a video

`render.mjs` steps a headless Chrome through the timeline frame by frame and pipes the screenshots into ffmpeg. It needs Node 20+, Google Chrome and `ffmpeg`.

```sh
npm install
npm run render                  # out/hot-water.mp4
STYLE=textbook npm run render   # out/hot-water-textbook.mp4
node render.mjs 12 37.5         # stills at those seconds instead of a video
```

## Fonts

`fonts/` holds Bangers and Comic Neue for the comic style, both under the SIL Open Font License (licence texts alongside). The other styles use system fonts (Avenir Next, Futura, DIN), so they are meant to be rendered on macOS.
