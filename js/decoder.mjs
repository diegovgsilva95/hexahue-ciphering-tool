import { HexahueCommons } from "./common.mjs"
import {loadImage, log, perfLog, RGB, RGBToHSL, sleep} from "./utils.mjs"

class HexahueDecoder extends HexahueCommons {
    MINSIZE = 10
    constructor(){
        super()
        this.precomputeHSLPalette()
        
        this.loaded = false
        this.mainCanvas = document.querySelector("canvas.preview-main")
        /** @type {CanvasRenderingContext2D} */
        this.mainCtx = this.mainCanvas.getContext("2d")

        this.initCanvasUI()
        this.initControls()
        this.initInfo()
    }

    precomputeHSLPalette(){
        this.PALETTE_HSL = this.PALETTE.map(palRGB => RGBToHSL(...palRGB))
    }

    /** Computation of palette and other graphical computations */
    getAvgColor(ox,oy,w,h){ // this can be, by far, the heaviest function for CPU affairs
        const {W, H, imgDataLong} = this

        let AC = [0,0,0]
        let QW = w
        let QH = h

        if(ox + w >= W)
            QW -= (ox + w)-W
        
        if(oy + h >= H)
            QH -= (oy + h)-H

        let RH = Math.min(H, oy+h)
        let RW = Math.min(W, ox+w)
        let DC = 1/(QW*QH)
        oy = Math.max(0, oy|0)
        ox = Math.max(0, ox|0)

        for(let y = oy; y < RH; y++){
            let oi = y * W
            for(let x = ox; x < RW; x++){
                let i = oi + x
                let FP = imgDataLong[i]
                let r = (FP>> 0) & 255
                let g = (FP>> 8) & 255
                let b = (FP>>16) & 255

                AC[0] += r*DC
                AC[1] += g*DC
                AC[2] += b*DC
            }
        }
        return [AC[0]|0,AC[1]|0,AC[2]|0]
    }
    getClosestColor(thisColor){
        let thisColorHSL = RGBToHSL(...thisColor)

        let minimalIdx = null
        let minimalDelta = null
        for(let idx in this.PALETTE_HSL){
            let thatColorHSL = this.PALETTE_HSL[idx]
            let thisH = thisColorHSL[0]
            let thatH = thatColorHSL[0]        
            let hueDelta = Math.min(Math.abs(thatH-thisH), 360-Math.abs(thatH-thisH));
            let delta = Math.hypot(hueDelta, thisColorHSL[1]-thatColorHSL[1] , thisColorHSL[2]-thatColorHSL[2] )

            if(minimalIdx === null || delta < minimalDelta){
                minimalIdx = idx
                minimalDelta = delta
            }
        }

        return [+minimalIdx, this.PALETTE[minimalIdx]]
    }
    getClosestColorAlt(thisColor){ // Alternative version involving weighted minimization
        let thisColorHSL = RGBToHSL(...thisColor)
    
        let minimalIdx = null
        let minimalDelta = null
        const HSL_WEIGHTS = [1.0,1.0,1.5]

        for(let idx in this.PALETTE_HSL){
            let thatColorHSL = this.PALETTE_HSL[idx]

            let [thisH, thisS, thisL] = thisColorHSL
            let [thatH, thatS, thatL] = thatColorHSL

            let hueDelta = Math.min(Math.abs(thatH - thisH), 360 - Math.abs(thatH - thisH))
    
            let delta = Math.sqrt(
                HSL_WEIGHTS[0] * hueDelta ** 2 +
                HSL_WEIGHTS[1] * (thisS - thatS) ** 2 +
                HSL_WEIGHTS[2] * (thisL - thatL) ** 2
            )
    
            if(minimalIdx === null || delta < minimalDelta){
                minimalIdx = idx
                minimalDelta = delta
            }
        }
        return [+minimalIdx, this.PALETTE[minimalIdx]]
    }
    extractGrid(ox,oy,s){
        this.registerTiming("Extract grid", false)

        const {mainCtx, W, H} = this
        let matrix = []
        let CQY = Math.ceil((H-oy)/s)
        let CQX = Math.ceil((W-ox)/s)

        mainCtx.globalAlpha=this.blockMode

        for(let iy = 0; iy<CQY; iy++){
            let OQY = iy*s+oy
            let row = []
            for(let ix = 0; ix<CQX; ix++){
                let OQX = ix*s+ox
                let avg = this.getAvgColor(OQX, OQY, s, s)
                let closest = this.getClosestColor(avg)
                row.push(closest[0])
                mainCtx.fillStyle = RGB(...closest[1])
                mainCtx.fillRect(OQX, OQY, s, s)
            }
            matrix.push(row)
        }

        mainCtx.globalAlpha=1

        this.registerTiming("Extract grid", true)

        return matrix
    }
    mapPoss(s){ // e.g. "325461" -> "214350" -> "K"
        let poss = []
        let dimmed = 0
        // hardcoding gray  0 7 and 14, so plz CHANGE THIS if the palette changes
        // also 1(dark red)->8(light red) as possibility
        // As mode=0 would conflict with colors, break undefined on previousgray and not gray
        let errored = false
        let lastGrayState = null
        for(let c of s){
            let nc = parseInt(c,16)
            let palC = this.PALETTE[nc]
            let isGray = palC[0]==palC[1]&&palC[1]==palC[2]
            let isDim = Math.max(...palC)<=128

            if(lastGrayState === null)
                lastGrayState = isGray
            else if(lastGrayState != isGray){
                errored = true
                break
            }


            if(isGray)
                nc = nc/7|0
            else {
                if(!isDim) 
                    nc = nc-7
                else
                    dimmed++
                nc--
            }

            poss.push(nc)
        }

        if(errored)
            return null

        let colorcode = (lastGrayState ? "0":(dimmed > 3 ? "1" : "2")) + poss.join("")
        for(let [c,cc] of this.HEXAHUE)
            if(cc == colorcode)
                return c
        
        return null

    }


    /** Control UI related (input elements) */
    initControls(){
        this.changed = false
        /** @type {HTMLInputElement} */
        this.ctrlImg = document.querySelector("#decoder-img")
        let signalers = []

        signalers.push(this.ctrlOX = document.querySelector("#decoder-ox"))
        signalers.push(this.ctrlOY = document.querySelector("#decoder-oy"))
        signalers.push(this.ctrlS = document.querySelector("#decoder-s"))
        signalers.push(this.ctrlOut = document.querySelector("#decoder-payload"))
        signalers.push(this.ctrlGridMode = document.querySelector("#decoder-grid"))
        signalers.push(this.ctrlBlockMode = document.querySelector("#decoder-blocks"))


        this.installChangeSignaler(signalers, ["change"])
        this.ctrlImg.addEventListener("change", this.loadImg.bind(this))

        setInterval(this.checkReparse.bind(this), 1000/5)

    }
    signalChange(){
        this.changed = true
    }


    /** Canvas-UI related (using mouse/touch to set the grid)  */
    initCanvasUI(){
        this.rectOrigin = null
        this.rectLast = null
        this.mainCanvas.addEventListener("mousedown", this.startRect.bind(this))
        this.mainCanvas.addEventListener("mousemove", this.developRect.bind(this))
        this.mainCanvas.addEventListener("mouseup", this.stopRect.bind(this))
        
        this.mainCanvas.addEventListener("touchstart", this.startRect.bind(this))
        this.mainCanvas.addEventListener("touchmove", this.developRect.bind(this))
        this.mainCanvas.addEventListener("touchend", this.stopRect.bind(this))
        setInterval(this.previewRect.bind(this), 1000/30)
    }
    setOXYS(ox,oy,s){
        this.ctrlS.value = s
        this.ctrlOX.value = ox
        this.ctrlOY.value = oy
        this.changed = true
    }
    /** @param {MouseEvent|TouchEvent} ev */
    retrieveXYFromEvRect(ev){

        let scaleW = this.mainCanvas.width/this.mainCanvas.clientWidth
        let scaleH = this.mainCanvas.height/this.mainCanvas.clientHeight

        if(ev.targetTouches) //TODO: Try to make this thing compatible with touching, because touches don't have offsetX/offsetY
            // if(ev.targetTouches.length == 1)
            //     return [
            //         ev.targetTouches.item(0).clientX*scaleW, 
            //         ev.targetTouches.item(0).clientY*scaleH
            //     ]
            // else
                return null //sorry mobile users

        return [ev.offsetX*scaleW, ev.offsetY*scaleH]
    }
    /** @param {MouseEvent} ev */
    startRect(ev){
        if(!this.loaded) return
        ev.preventDefault()
        if(ev.type.startsWith("mouse") && ev.button != 0) return
        this.rectLast = this.rectOrigin = this.retrieveXYFromEvRect(ev)
    }
    developRect(ev){
        if(!this.loaded || this.rectOrigin === null) return
        ev.preventDefault()
        if(ev.type.startsWith("mouse") && ev.button != 0) return
        this.rectLast = this.retrieveXYFromEvRect(ev)
    }
    computeRect(){
        let minOX = Math.min(this.rectOrigin[0], this.rectLast[0])
        let minOY = Math.min(this.rectOrigin[1], this.rectLast[1])

        let maxOX = Math.max(this.rectOrigin[0], this.rectLast[0])
        let maxOY = Math.max(this.rectOrigin[1], this.rectLast[1])

        let SX = maxOX-minOX
        let SY = maxOY-minOY
        let S = Math.max(SX, SY)
        return [minOX, minOY, S]
    }
    stopRect(ev){
        if(!this.loaded || this.rectOrigin === null) return
        ev.preventDefault()
        if(ev.type.startsWith("mouse") && ev.button != 0) return

        let [ox,oy,s] = this.computeRect()
        if(isNaN(s) || s == null || s < this.MINSIZE){
            this.rectOrigin = null
            this.rectLast = null
    
            return
        } 

        this.setOXYS(ox,oy,s)

        this.rectOrigin = null
        this.rectLast = null
    }
    previewRect(){
        if(!this.loaded || this.rectOrigin === null || this.rectLast === null) return

        this.drawImg()
        let [ox,oy,s] = this.computeRect()

        if(isNaN(s) || s == null || s < this.MINSIZE) return

        this.drawGrid(ox,oy,s,3)
        this.setOXYS(ox,oy,s)
    }


    /** Loading and resetting */
    async loadImg(){
        let item = this.ctrlImg.files.item(0)
        let mime = item.type||"image/jpg"
        let buf = await item.arrayBuffer()
        let blob = new Blob([buf], {type: mime})
        let bloburi = URL.createObjectURL(blob)
        await this.init(bloburi)
        await sleep(500)
        URL.revokeObjectURL(bloburi)
    }
    async init(url, ox, oy, s){
        this.registerTiming("Init", false)
        this.img = null
        this.loaded = false
        this.changed = false
        try {
            this.img = await loadImage(url)
        }
        catch(e){
            this.registerTiming("Init", true)
            alert("Couldn't load image. Leaving.")
            return
        }
        let W = this.W = this.img.width
        let H = this.H = this.img.height

        this.ctrlOX.max = W
        this.ctrlOX.value = ox||0
        this.ctrlOY.max = H
        this.ctrlOY.value = oy||0
        this.ctrlS.max = Math.min(W/2,H/3)|0
        this.ctrlS.value = Math.min(this.ctrlS.max, s||64)
        this.gridMode = this.ctrlGridMode.value

        this.imgCanvas = new OffscreenCanvas(W, H)
        this.imgCtx = this.imgCanvas.getContext("2d")
        this.imgCtx.drawImage(this.img, 0, 0)

        this.imgData = this.imgCtx.getImageData(0, 0, W, H, {})
        this.imgDataLong = new Uint32Array(this.imgData.data.buffer)

        this.mainCanvas.width = W
        this.mainCanvas.height = H
        this.loaded = true
        this.registerTiming("Init", true)
        this.changed=true
        this.checkReparse()
    }


    /** Drawing artifacts */
    drawGrid(ox,oy,s,T=1){
        this.registerTiming("Draw grid", false)
        const {mainCtx, W, H} = this

        if(s == null || isNaN(s)){
            this.registerTiming("Draw grid", true)
            alert("Invalid dimensions!")
            throw new Error("Invalid dimensions")
            return
        }

        let gridMode

        if(this.rectLast){
            gridMode = 7
        }
        else {
            gridMode = this.gridMode
            if(+gridMode[0] > 2){ 
                this.registerTiming("Draw grid", true)
                return
            }

            if(gridMode[0] == 0) 
                gridMode = gridMode[1]*7
            else 
                gridMode = +gridMode[1]+8
        }

        mainCtx.save()
        mainCtx.lineWidth = T
        mainCtx.strokeStyle = RGB(...this.PALETTE[gridMode])
        mainCtx.beginPath()
        for(let y = oy; y <= H; y+=s){
            mainCtx.moveTo(0, y)
            mainCtx.lineTo(W, y)
        }
        for(let x = ox; x <= W; x+=s){
            mainCtx.moveTo(x,0)
            mainCtx.lineTo(x,H)
        }
        mainCtx.stroke()
        mainCtx.restore()

        this.registerTiming("Draw grid",true)
    }
    drawImg(){
        const {W, H} = this
        this.mainCtx.fillStyle = "#000"
        this.mainCtx.fillRect(0,0,W,H)
        this.mainCtx.drawImage(this.img, 0, 0)
    }


    /** Textual decoding */
    checkReparse(){
        if(this.loaded && this.changed){
            this.changed = false
            this.gridMode = this.ctrlGridMode.value
            this.blockMode = (+(this.ctrlBlockMode.value||10))/10
            this.reparse()
        }
    }
    reparse(){
        const {ctrlOX, ctrlOY, ctrlS, ctrlOut} = this
        this.drawImg()
        
        let S = Math.max(1,+ctrlS.value)
        let OX = +ctrlOX.value
        let OY = +ctrlOY.value
        let matrix = this.extractGrid(OX, OY, S)
        this.drawGrid(OX, OY, S)

        this.registerTiming("Reparse", false)
        let seq = []
        for(let y = 0; y < matrix.length; y+=3){
            let rowseq = []
            let rows = matrix.slice(y, y+3)
            if(rows.length < 3) continue
            let rl = rows[0].length

            for(let x = 0; x < rl; x+=2){
                let cols = rows.map(row => row.slice(x, x+2)).filter(row => row.length == 2)
                if(cols.length == 0) break
                rowseq.push(cols.map(p=>(p.map(pp=>pp.toString(16))).join("")).join(""))
            }
            seq.push(rowseq)
        }
        ctrlOut.value = this.decodeHexahue(seq)
        this.registerTiming("Reparse", true)

    }
    decodeHexahue(seq){
        let out = ""

        for(let row of seq){
            for(let s of row){
                let poss = this.mapPoss(s)
                if(poss === null) poss = "\u26A0"

                out += poss 
            }
            out+="\n"
        }
        return out
    }

    /** Debug information and performance */
    initInfo(){
        this.ctrlInfo = document.querySelector("#decoder-info")
        this.infoDict = {}
        this.currentTimings = {}
        this.lastTimings = {}
        setInterval(this.showInfo.bind(this), 300)
        this.showInfo()
    }
    showInfo(){
        let output = []
        let imgStat;
        if(!this.loaded)
            imgStat = "Not loaded"
        else if(typeof this.img === "undefined" || !(this.img instanceof HTMLImageElement))
            imgStat = "Loaded without image (Bug?)"
        else 
            imgStat = `Loaded (${[this.img.width, this.img.height].join(" x ")})`

        output.push(`Image: ${imgStat}`)
        output.push("")
        output.push("Performance from last 1s (min-max (avg, tot, amt)):")
        output.push(...this.printTimings())
        // output.push(``)
        this.ctrlInfo.innerText = output.join("\n")
        this.cleanTimings()
    }
    registerInfo(name, key){
        this.infoDict[name] = key
    }
    registerTiming(algo, done = false){
        let dn = Date.now()
        if(!done)
            this.currentTimings[algo] = dn
        else {
            let elapsed = dn - (this.currentTimings[algo]||0)
            this.lastTimings[algo] = this.lastTimings[algo]||[]
            this.lastTimings[algo].push({when: this.currentTimings[algo], elapsed})
        }
    }
    printTimings(){
        let out = []
        for(let algo in this.lastTimings){
            let allTimes = this.lastTimings[algo]
            let n = allTimes.length
            if(n == 0) continue
            allTimes = allTimes.map(t => t.elapsed)
            let maxTime = Math.max(...allTimes)
            let minTime = Math.min(...allTimes)
            let avgTime = allTimes.reduce((p,v) => p+v/n, 0)
            let totTime = allTimes.reduce((p,v) => p+v)
            out.push(`${algo}: ${minTime.toFixed(0)}ms-${maxTime.toFixed(0)}ms (avg ${avgTime.toFixed(0)}ms, tot ${totTime.toFixed(0)}ms, ${n} iteractions)`)
        }
        return out
    }
    cleanTimings(){
        let dn = Date.now() - 1000
        for(let algo in this.lastTimings)
            this.lastTimings[algo] = this.lastTimings[algo].filter(t => t.when >= dn)
    }

}

window.hexa = HexahueDecoder.getInstance()
await HexahueCommons.checkRFP()
await HexahueDecoder.getInstance().init("sombrero.jpg", 979,65,32) //sombrero.jpg
