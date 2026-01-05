window.onload = function () {
    let originalCanvas = document.getElementById('originalCanvas');
    let originalContext = originalCanvas.getContext('2d');

    let targetCanvas = document.getElementById('targetCanvas');
    let targetContext = targetCanvas.getContext('2d');

    let w;
    let h;

    let image = new Image();
    image.src = '../assets/download.png';
    
    image.onload = function () {
        w = image.width;
        h = image.height;

        originalCanvas.width = w;
        originalCanvas.height = h;

        targetCanvas.width = w;
        targetCanvas.height = h;

        originalContext.drawImage(image, 0, 0);

        applyProcessing();
    }

    let kernel = [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1]
    ]

    function applyProcessing()
    {
        console.log(w);
        console.log(h);

        let imageData = originalContext.getImageData(0, 0, w, h);
        console.log(imageData);
        let pixels = imageData.data;
        let output = new Uint8ClampedArray(w * h * 4);

        for (let y = 1; y < h - 1; y++)
        {
            for (let x = 1; x < w - 1; x++)
            {
                let sum = 0;

                for (let ky = -1; ky <=1; ky++)
                {
                    for (let kx = -1; kx <=1; kx++)
                    {
                        let pixelIndex = ((y + ky) * w + (x + kx)) * 4
                        let pixelValue = pixels[pixelIndex];
                        sum += pixelValue * kernel[ky + 1][kx + 1];
                    }
                }

                sum = Math.max(0, Math.min(sum, 255));

                let pixelIndex = (y * w + x) * 4;
                output[pixelIndex] = sum;
                output[pixelIndex + 1] = sum;
                output[pixelIndex + 2] = sum;
                output[pixelIndex + 3] = 255;
            }
        }

        let imgData = new ImageData(output, w, h);
        targetContext.putImageData(imgData, 0, 0);
    }
}