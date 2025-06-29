import { loadImage, RGB, GRAY, Singleton } from "./utils.mjs"

class HexahueThing extends Singleton{

    mode = "encode"
    boxentriqAlphabet = /[0-9A-Z\.\, ]/
    constructor(){
        super()
        this.computeHexahuePalette()

    }

    // This is how I built "ABEDMJKNCIGYSUa":
    /*
    let c = [0]

    ;[1,2].forEach(mag => {  
        
        for(let i = 0; i < 6; i++){
            let ih = i/2
            let [l,u] = [(ih|0)%3, Math.ceil(ih)%3]

            c.push(mag*3**l + (l==u ? 0 : mag*3**u))
        }
        c.push(mag*3**0 + mag*3**1 + mag*3**2)
    })
    c.map(x=>BASE64_ALPHABET[x]).join("") // there's your ABEDMJKNCIGYSUa
    */
    PALETTE = [..."ABEDMJKNCIGYSUa"].map(c => [1,3,9].map(k => (((atob(c+"A==").charCodeAt()>>2)/k|0)%3)*127.5|0))
    // Cryptic, but it's better than
    // [[0,0,0],[127,0,0],[127,127,0],[0,127,0],[0,127,127],[0,0,127],[127,0,127],[127,127,127],[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255],[255,255,255]]
    // ... or
    //[0,127,32639,32512,8355584,8323072,8323199,8355711,255,65535,65280,16776960,16711680,16711935,16777215].map( ... )
    // The atob "hack" wouldn't be needed if JS exposed the alphabet behind Base64 encoding in a native way (e.g. atob.chars or atob.alphabet or whatever other property).
    // Yeah, I could've declared the alphabet as a constant (or could've computed it on-the-fly because it follows a clear math pattern). But no.
    // Without further ado, let me continue.

    computeHexahuePalette(){
        // The whole, unpacked data took 1466 chars and 70 lines...
        let hexaPalette = []
        let hexaData = "ACoRjBCFRjCCCpjDCCNjECCMrFCCMdGCQMdHCREdICRgdJCRjFKCRjoLCKjoMCMToNCMaoOCMdQPCMdCQChdCRCjNCSCjpCTCjoKUCjoRVCcoRWCdgRXCdERYCdChZCdCMaBoRjbBFRjcBCpjdBCNjeBCMrfBCMdgBQMdhBREdiBRgdjBRjFkBRjolBKjomBMTonBMaooBMdQpBMdCqBhdCrBjNCsBjpCtBjoKuBjoRvBcoRwBdgRxBdERyBdChzBdCM.ACQC,AQCQ ASSS AAAA0ABQK1AIQK2AKAK3AKBC4AKBQ5ARBQ6AQJQ7AQKI8AQKB9ACKB"

        /*
        This is how I built hexaData:
        let fst = ""

        for(let [c, b] of HEXAHUE){ // HEXAHUE is an array of arrays: [["A", "2502143"], ["B", "2052143"], ...]
            let s = "000"+[...b].map(x=>(+x).toString(2).padStart(3,"0")).join("")
            let ts = s.match(/[01]{1,6}/g).map(x=>alfa[parseInt(x,2)]).join("")
            fst += c + ts
        }
        fst //=> hexaData
        */

        for(let j = 0; j < hexaData.length; j+=5){
            let c = hexaData[j]
            let h = hexaData.slice(j+1, j+5)
            let t = [...h].map(x=>(atob(x+"A==").charCodeAt()>>2)).reduce((p,x)=>[...p,x>>3,x&7],[]).slice(1).join("")
            hexaPalette.push([c,t])
        }
        this.HEXAHUE = hexaPalette
    }


    async init(mode, payload = null, size = 20){
        this.mode = mode||"alphabet"
        this.payload = payload
        this.size = size

        let C = this.canvas = this.canvas||document.querySelector("canvas")
        /** @type {CanvasRenderingContext2D} */
        this.ctx = this.ctx||C.getContext("2d")


        if(this.mode == "palette"){
            this.W = C.width = 900
            this.H = C.height = 100
            requestAnimationFrame(this.drawPalette.bind(this))
            return
        }

        if(this.mode == "compare"){
            let I = null
            try {
                I = this.img = await loadImage("./hexahue-alphabet.png")
            } catch(e){
                console.error("Couldn't load image. Leaving.")
                return
            }

            this.W = C.width = I.width
            this.H = C.height = I.height

            requestAnimationFrame(this.drawCommonAlphabet.bind(this))
            return
        }

        if(this.mode == "alphabet"){
            this.W = C.width = 800
            this.H = C.height = 600

            requestAnimationFrame(this.drawFullAlphabet.bind(this))
            return
        }

        if(this.mode == "encode"){
            requestAnimationFrame(this.drawEncoded.bind(this))
            return
        }
    }

    drawChar(char, x, y, S, choice = 0){
        let {ctx} = this
        let colors

        if(char.length == 1){
            let colorcode = this.HEXAHUE.filter(x => x[0] == char)
            if(colorcode.length == 0 || !colorcode[choice]) return
            colors = this.colorcodeToRGB(colorcode[choice])
        } else  // then char is expected to be the full colorcode instead 
            colors = this.colorcodeToRGB(char)
        
        for(let j = 0; j < 6; j++){
            let jxi = j%2
            let jyi = j/2|0

            ctx.fillStyle = RGB(...colors[j])
            ctx.fillRect(x+jxi*S, y+jyi*S, S, S)
        }
    }
    strokeFillText(text, posX, posY){
        let {ctx} = this
        ctx.strokeText(text, posX, posY)
        ctx.fillText(text, posX, posY)
    }
    drawPalette(){
        const strokeFillText = this.strokeFillText.bind(this)
        let {ctx,W,H, PALETTE} = this
        let w = W/PALETTE.length
        let s = Math.min(w/4, H/8)

        ctx.save()
        ctx.fillStyle = GRAY(192)
        ctx.fillRect(0,0,W,H)
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `${s*0.8}px monospace`
        ctx.strokeStyle = GRAY(0)
        ctx.lineWidth = w/40
        for(let [idx,color] of Object.entries(PALETTE)){
            let x = idx*w
            ctx.fillStyle = RGB(...color)
            ctx.fillRect(x, 0, w, H)
            ctx.fillStyle = GRAY(255)

            strokeFillText(`${idx}`, x + w/2, s)
            
            let tri = color.map(a=>a/127|0).join("")
            strokeFillText(`${tri}`, x + w/2, s*3)
            
            strokeFillText(`${color[0]}`, x + w/2, s*5)
            strokeFillText(`${color[1]}`, x + w/2, s*6)
            strokeFillText(`${color[2]}`, x + w/2, s*7)
        }

        ctx.restore()

        let a = document.createElement("a")
        a.download = "palette.png"
        a.href = this.canvas.toDataURL("image/png")
        a.innerText = "Download palette as PNG image"
        document.body.appendChild(a)
    }

    colorcodeToRGB(colorcode){
        // colorcode example = "2025143" (string)

        // Modes: 0 = Grays, 1 = Low color, 2 = High color

        // Palette for mode 0 = 0 (0 black), 1 (7 gray), 2 (14 white)
        // Palette for mode 1 = 0 (1 red), 1 (2 yellow), 2 (3 green), 3 (4 cyan), 4 (5 blue), 5 (6 fuchsia)
        // Palette for mode 2 = 0 (8 red), 1 (9 yellow), 2 (10 green), 3 (11 cyan), 4 (12 blue), 5 (13 fuchsia)
        // So 0=RED 1=YELLOW 2=GREEN 3=CYAN 4=BLUE 5=FUCHSIA

        // Lowercase = low color, uppercase = high color (thus compatible with the original alphabet)

        let m = (+colorcode[0])
        // 0 => c*7+0
        // 1 => c*1+1
        // 2 => c*1+8 
        // g.f.: m => c * ((m==0)*6+1) + m**3

        let C = []
        let MM = (m==0)*6+1
        let MP = m**3
        for(let i = 0; i < 6; i++){
            let cci = (+colorcode[i+1]) * MM + MP
            C.push(this.PALETTE[cci])
        }

        return C
    }

    drawAlphabet(frame = 0, S = 1, common = false){
        let {ctx,canvas,W,H, PALETTE} = this
        let showMode = (frame/125|0)%2
        let [ix,iy] = [0,0]

        ctx.save()
        ctx.fillStyle = GRAY(255)
        ctx.fillRect(0,0,W,H)
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `700 ${S}px sans-serif`
        canvas.style.imageRendering="pixelated"
        ctx.strokeStyle = GRAY(0)
        ctx.lineWidth = 0.5

        if(common){
            ctx.globalAlpha = showMode == 0 ? 0.125 : 1
            ctx.drawImage(this.img, 0, 0)
            ctx.globalAlpha = showMode == 1 ? 0.125 : 1
        }

        for(let [char, colorcode] of this.HEXAHUE){
            if(common && !char.match(this.boxentriqAlphabet)) continue

            let ox = (S/5)+ix*((S*2)+S/2)
            let oy = (S/5)+iy*((S*3)+S*2.05)

            this.drawChar(colorcode, ox+1, oy+2, S)

            ctx.fillStyle = "#000"
            ctx.fillText(char, ox+S, oy+S*4.1)

            ix++
            if((!common && ix*8*S/3 > W) || (common && ix == 10)){
                ix = 0
                iy++
            }
        }

        ctx.restore()
    }
    drawCommonAlphabet(frame = 0){  // to compare the coded alphabet with the boxentriq.com "original" alphabet
        this.drawAlphabet(frame, 24, true)
        requestAnimationFrame(this.drawCommonAlphabet.bind(this))
    }
    drawFullAlphabet(frame = 0){
        this.drawAlphabet(frame, 20, false)
    }

    drawEncoded(){
        // First, try to parse the payload.
        const {canvas, ctx} = this
        ctx.save()
        const S = Math.abs(this.size)||1
        const ROW_LIMIT = 1000/(S*2) // example: if S = 20, 1000/40 = max 25 characters per row
        let error = null
        let rows = []
        let currentRow = []
        for(let char of this.payload){
            if(char == "\n"){
                rows.push(currentRow)
                currentRow = []
                continue
            }
            let found = this.HEXAHUE.filter(x => x[0]==char)
            if(!found || found.length == 0){
                error = `Character not found: ${char}`
                break  
            }
            currentRow.push(found[0][1])
            if(currentRow.length > ROW_LIMIT){ //too long, break it
                rows.push(currentRow)
                currentRow = []
            }
        }

        if(currentRow.length>0) rows.push(currentRow)

        if(rows.length == 0 || (rows.length == 1 && rows[0].length == 0)) error = "Empty payload"
        if(error){
            const W = canvas.width = 640
            const H = canvas.height = 360
            ctx.fillStyle = GRAY(64)
            ctx.fillRect(0,0,W,H)
            ctx.fillStyle = RGB(255,0,0)
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = `700 ${H/12}px sans-serif`
            this.strokeFillText(error, W/2, H/2)
            ctx.restore()
            return
        }


        let WI = Math.max(...rows.map(r=>r.length))
        let HI = rows.length

        const W = canvas.width = WI * S*2
        const H = canvas.height = HI * S*3
        ctx.fillStyle = GRAY(64)
        ctx.fillRect(0,0,W,H)
        for(let [rowIdx, row] of Object.entries(rows)){
            let iy = (+rowIdx) * S * 3
            for(let [colIdx, col] of Object.entries(row)){
                let ix = (+colIdx) * S * 2
                this.drawChar(col, ix, iy, S)
            }
        }
        ctx.restore()
    }
    static prepareToEncodeUserInput(){

        let changed = false
        let textarea = document.querySelector("textarea")
        
        textarea.addEventListener("change", _ => changed = true)
        textarea.addEventListener("keyup", _ => changed = true)
        textarea.addEventListener("keydown", _ => changed = true)
        textarea.addEventListener("paste", _ => changed = true)
        
        setInterval(() => {
            if(!changed) return
            changed = false
        
            HexahueThing.getInstance().init("encode", textarea.value, 32)
        
        }, 1000/5);
        
        
        let canvas = document.querySelector("canvas")
        
        canvas.addEventListener("dblclick", function(){
            let pngData = canvas.toDataURL("image/png")
            let a = document.createElement("a")
            a.download = `${Date.now()}.png`
            a.href = pngData
            a.click()
            a.remove()
        })
    }
}

HexahueThing.prepareToEncodeUserInput()