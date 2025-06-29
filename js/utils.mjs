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
