import { RFPTester } from "./test-rfp.mjs"
import { Singleton } from "./utils.mjs"

export class HexahueCommons extends Singleton {

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

    signalChange(){
        this.changed = true
    }


    installChangeSignaler(elements, eventNames){
        for(let eventName of eventNames)
            for(let element of elements)
                element.addEventListener(eventName, this.signalChange.bind(this))
    }


    static async checkRFP(){
        let [_, browserIsF___ingWithCanvas] = await RFPTester.getInstance().batchTest(5)

        if(browserIsF___ingWithCanvas){
            let warnUserElm = document.createElement("div")
            warnUserElm.classList.add("toast-warn")
            warnUserElm.innerText = `Your browser (probably Librewolf) is tampering with canvases. This project as a whole won't work as intended. There's nothing I can do, sorry.\n(I could suggest you to disable ResistFingerPrint or switch browsers but, well, you're the user, not me, I'm just a damn webpage)`
            document.body.appendChild(warnUserElm)
        }
    }
}