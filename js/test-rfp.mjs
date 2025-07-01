import { RGB, Singleton, irand, sleep } from "./utils.mjs"

export class RFPTester extends Singleton {
    constructor(){
        super()
        this.lastResult = null
        this.totalPixels = 0
        this.totalHarmed = 0
    }
    async test(){
        let found = false
        let sample = [irand(0,255),irand(0,255),irand(0,255)]
        let [testW, testH] = [32,32]
        let alice = (new OffscreenCanvas(testW, testH)).getContext("2d")
        let bob = (new OffscreenCanvas(testW, testH)).getContext("2d")

        bob.fillStyle = RGB(...sample)
        bob.fillRect(0, 0, testW, testH)
        await sleep(50)

        alice.drawImage(bob.canvas, 0, 0)
        await sleep(50)
        
        let data = alice.getImageData(0,0,alice.canvas.width,alice.canvas.height)
        let dataLong = new Uint32Array(data.data.buffer)

        this.totalPixels += dataLong.length
        for(let i = 0; i < dataLong.length; i++){
            let P = dataLong[i]
            let PRGB = [0,8,16].map(k => (P>>k)&255)
            if(PRGB[0] != sample[0] || PRGB[1] != sample[1] || PRGB[2] != sample[2]){
                this.totalHarmed++
                found = true
                // break
            }
        }
        if(this.lastResult === null)
            this.lastResult = found
        else // to deal with mathematically-possible false negatives
            this.lastResult = this.lastResult || found

        return found
    }
    async batchTest(count = 5){
        let curr = 0
        do {
            await this.test()
            if(++curr == count) break
        } while(!this.lastResult)

        return [curr, this.lastResult, this.totalHarmed, this.totalPixels]
    }
}