# 启动动画 · 视频提示词

- 模型：MiniMax-H3，2K，6 秒，首尾帧模式
- 首帧：[01-circuit.jpg](../animations/boot/keyframes/01-circuit.jpg)；尾帧：[04-smile.jpg](../animations/boot/keyframes/04-smile.jpg)
- 02、03 两个中间节拍写在提示词里（H3 只接受首尾两张关键帧）

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 6.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] Refined 2D anime illustration, a static frontal medium close-up of a young woman's upper body, matching Picture 1. She first exists only as glowing cyan circuit-trace line art on a near-black background: her hair strands, closed eyelids, nose, lips, low twin ponytails with ribbons, collar and brooch are drawn with thin luminous traces with tiny solder dots, while faint vertical columns of tiny glyphs drift in the dark background. The rose-pink neon tattoo at the outer corner of her left eye (screen right) glows brightest: a small round octopus icon with two curled ear fins and three rounded lower lobes, surrounded by fine curling flourish lines. Bright pulses run along the traces, then the background glyph columns peel away into strings of glowing code that flow along the circuit traces and wind around her hair and shoulders like data being injected. Wherever the code strings pass, real color and texture fill in from her face downward — blue-to-aqua gradient twin tails, white ribbons, pearl-gray capelet, sage high collar, pearl octopus brooch — while her eyes stay gently closed and the tattoo keeps the same shape, its glow softening into a pink skin tattoo. Once she is fully colored, the last code strings scatter from her hair tips into tiny cyan particles and the background settles into deep slate blue. She slowly opens her pink eyes, her gaze focuses and lands directly on the viewer, eyebrows lifting slightly as if she has just discovered someone. After a brief beat of eye contact, she breaks into a bright, playful open-mouth smile with eyes slightly curved; her head stays level and front-facing, and her hair ends sway gently. The shot ends holding on the smiling frame of Picture 2. The tattoo design stays identical throughout; no readable text appears on screen.

overall_soundscape: Soft digital ticks and a low electric hum as pulses race along the circuit lines, a rising shimmer of data chirps as the code strings flow and color fills in, a gentle airy sparkle as the particles scatter, then a soft breath and a short light giggle as she smiles; no speech.

non_diegetic_music: A clean, minimal electronic motif of plucked synth arpeggios over a soft pad, building steadily while the code flows, then resolving into a bright music-box chime phrase at the smile and ending on a sustained note.
```
