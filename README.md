## What is Hexahue?
See [Boxentriq](https://www.boxentriq.com/code-breaking/hexahue) for more info.

## Purpose
Hiding (and revealing the hidden) messages in plain sight using seemingly-innocent combinations of colors. It's utterly effective if the resulting color grid is used a basis for a drawing or photo (e.g. a book shelf strategically rearranged with books whose covers have individual colors from each cell/row).

> _"Signs and symbols rule the world, not words nor laws"_
(not said by Confucius, but the phrase itself holds some truth)

## Trivia
The code itself has lots of cryptic parts. I used non-standard techniques such as:
 - Base64 as a means of compression (as strange as it may sound, yeah, the base64 it effectively compressed data, even though Base64 is not originally meant for compression, more below)
 - 16-color DOS-like palette (actually, just 15) encoded as ternary

15 colors were encoded as 16 bytes (`ABEDMJKNCIGYSUa`), while a full alphabet (66 characters, including two different space encodings), something that originally takes 1057 bytes (minified JSON), became a Base64 string with just 330 bytes plus ~300 bytes of decompression code (ignoring indentation). This is what I meant with my earlier statement _"base64 as a means of compression"_. 

Can you discover which message lies behind the figure in _sombrero_? (And I'm not talking about its Hexahue decoding)

## What it currently does?
- Encodes text using Hexahue
- Extends Hexahue's original alphabet with upper and lowercase variations (lowercase got the same colors as uppercase, but dimmer)
- Debug feature: render the current 16-color palette (actually, only 15 colors) as a image strip
- Debug feature: render the current alphabet
- Debug feature: render a blinking comparison betwen the Boxentriq's Hexahue alphabet and the current Hexahue alphabet.
- Decodes text using a precisely controlled grid (number input or mouse/touch input).

## What could be improved?
- ~~Some kind of decoding mechanism~~ Done!
- More non-letter characters (there's mathematical room for some alphabetic expansion)
- Margins, different color palettes (e.g. pastel tones) and textures...
- Additional ways to compute each block color (e.g. midpoint, weighted sampling, scattered sampling, etc)
- Improve the computation of block color (currently, `getAvgColor` is heavy for large pictures)

## How to use
1. Clone the repo
2. Setup some HTTP server for the folder

### Encoding
1. Access the index.htm using a browser.
2. Write the text that needs to be ciphered.
3. Double-click the canvas to save as PNG.

### Decoding
1. Access decoder.htm using a browser.
2. Choose an image using the file picker (or try the default one, the figure using a Sombrero)
3. Adjust the offset coordinates and the grid size, until readable text is displayed (if there's any encoded inside the image)

# License
See [LICENSE](LICENSE).

tl;dr: do whatever you want to do with the project (but it's not my fault).

# Philosophy

In the past, data had to be crammed into a very small amount of memory. Entire game maps and sprites could fit into a 16KB program written in Assembly. Every bit (not byte or KB, it's a single **bit**: zero or one) avoided was a bit saved. Many algorithms were born from that.

Today, a `node_modules` easily takes up hundreds of MBs of space even in a production environment and it's "okay". Code _must be clean_ and devoid of thinking-outside-the-box creativity (otherwise, the "smart" LLM can't properly parse it) and must avoid personality (must wear a boring uniform and become another Agent Smith). _Code vibing_ replaced _code golfing_ and _code art_. Programmers must follow corporate "standardization" and must shout the buzzword from the _Current Thing™_. 

On this regard, I must shout: _Non serviam_!