export function loadImage(url, timeoutMs = 1000){

    let img = new Image()
    return new Promise((res, rej) => {
        let timeoutFn = function(){
            img.src = ""
            img = null
            rej(new Error("Timeout"))
        },
        timeout = setTimeout(timeoutFn, timeoutMs)

        img.src = url
        img.onload = function(){
            clearTimeout(timeout)
            res(img)
        }
        img.onerror = function(){
            clearTimeout(timeout)
            rej(new Error(`Load Error`))

        }

    })
}
export const rand = (n,x) => Math.random() * (x-n) + n;
export const irand = (n,x) => Math.round(rand(n,x));
export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const RGB = (r,g,b) => ["rgb(", [r,g,b].map(v => Math.min(255,Math.max(0,v)).toFixed(0)).join(", "), ")"].join("")
export const GRAY = v => RGB(v,v,v)
export const log = console.log.bind(console)
export class Singleton {
    static instance = null

    /**
     * @template T
     * @this {T}
     * @returns {InstanceType<T>}
    */
    static getInstance(){
        if(!this.instance)
            this.instance = new this()

        return this.instance
    }
}

export const RGBToHSL = (r,g,b)=>{
    r /= 255
    g /= 255
    b /= 255
    const l = Math.max(r, g, b)
    const s = l - Math.min(r, g, b)
    const h = s
        ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
        : 0;
    return [
        60 * h < 0 ? 60 * h + 360 : 60 * h,
        100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
        (100 * (2 * l - s)) / 2,
    ]
}


export function perfLog(...text){
    let t = window.performance ? performance.now() : Date.now() 
    log(t, ...text)
}