import { json } from "@codemirror/legacy-modes/mode/javascript";

// Filter visibility modifiers
export function filterVisibility(obj) {
    if (typeof obj === 'string') {
        return obj.replace(".private", "").replace(".public", "");
    } else if (Array.isArray(obj)) {
        return obj.map(item => filterVisibility(item));
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = filterVisibility(obj[key]);
        }
        return newObj;
    } else {
        return obj; // numbers, booleans, null, undefined, functions, etc.
    }
}

export function parseAleoStyle(input) {
    // Handle aleo addresses (e.g. `aleo1...`)
    if (typeof input === 'string' && input.length === 63 && input.startsWith("aleo1")) {
        return input.replace(/([a-zA-Z0-9]{64})/g, '"$1"');
    }

    // Handle aleo signatures (e.g. `0x...`)
    if (typeof input === 'string' && input.length === 216 && input.startsWith("sign1")) {
        return input.replace(/([a-zA-Z0-9]{217})/g, '"$1"');
    }

    // Quote all keys (e.g. `starting_bid:` -> `"starting_bid":`)
    let jsonLike = input.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Quote all suffixed aleo types like `u64` or `field`
    jsonLike = jsonLike.replace(/([0-9]+)(u64|field|group|scalar|u128|u8|u32|u16|i8|i16|i32|i64|i128")/g, '"$1$2"');

    // Ensure nested keys are properly quoted too (if any are missed)
    jsonLike = jsonLike.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    return JSON.parse(jsonLike);
}