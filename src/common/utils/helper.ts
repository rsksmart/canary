import retry  = require('async-await-retry');

export const checkTag = (value: string) => {
    value = String(value).toLowerCase();

    if (/^(0x)[0-9a-f]{64}$/.test(value)) {
        return value;
    }

    if (/^[0-9a-f]{64}$/.test(value)) {
        return "0x" + value;
    }

    return null;
};

export const toHex = (val, inByte: number) => {
    let hex = val.toString('16');
    if (hex.length % 2 == 1)
        hex = '0' + hex;

    if (hex.length < (inByte * 2)) {
        var left = (inByte * 2) - hex.length;
        for (var i = 0; i < left; i++) {
            hex = '0' + hex;
        }
    }

    return hex;
}

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const copy = (object: any) => {
    return JSON.parse(JSON.stringify(object));
}

export const retry3Times = async (func, params = null) => {
    return retry(func, params, {retriesMax: 4, interval: 4000, exponential: true});
}

export const numberToHex = (num: number) => {
    const width = 8;
    const n = num.toString(16);
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}