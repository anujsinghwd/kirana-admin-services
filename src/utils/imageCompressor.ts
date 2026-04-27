import sharp from "sharp";

export const compressImageTo70KB = async (
    inputBuffer: Buffer
): Promise<Buffer> => {
    const MAX_SIZE = 70 * 1024; // 70KB

    let quality = 80;
    let outputBuffer = await sharp(inputBuffer)
        .resize({ width: 800 }) // 🔥 resize for optimization
        .jpeg({ quality })
        .toBuffer();

    // 🔁 Reduce quality until under 70KB
    while (outputBuffer.length > MAX_SIZE && quality > 10) {
        quality -= 10;

        outputBuffer = await sharp(inputBuffer)
            .resize({ width: 800 })
            .jpeg({ quality })
            .toBuffer();
    }

    return outputBuffer;
};
