document.addEventListener('alpine:init', () => {
  Alpine.data('uploads', () => ({
      files: [],
      state: 'ready',
      maxWidth: 80,
      colourLimit: 0,
      imageUploaded: false,

      upload(e) {
        this.state = 'ready';
        this.writeImageToCanvas();
      },

      writeImageToCanvas() {
        const img = document.createElement('img');
        const canvas = document.getElementsByTagName('canvas')[0];
        this.imgUrl = img.src;

        const loadImage = () => {
          const ctx = canvas.getContext('2d');
          const maxWidth = this.maxWidth;
          if (img.width > maxWidth) {
            canvas.width = maxWidth;
            canvas.height = (maxWidth / img.width) * img.height;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          this.imageUploaded = true;

          // Check for colour limits
          if (parseInt(this.colourLimit, 10) !== 0) {
            const colourOpts = {
              colors: parseInt(this.colourLimit, 10),
            };
            const rgbChanger = new RgbQuant(colourOpts);
            rgbChanger.sample(canvas);
            rgbChanger.palette();
            const imgd = ctx.createImageData(canvas.width, canvas.height);
			      imgd.data.set(rgbChanger.reduce(canvas));
			      ctx.putImageData(imgd, 0, 0);
          }

        };
        img.onload = loadImage;
        const fileElement = document.getElementById('img-uploader');
        if (fileElement.files.length < 1) { return; }
        img.src = URL.createObjectURL(fileElement.files[0]);
        if (img.height > 0 || img.complete) {
          loadImage(); // Already loaded
        }
        this.generationString = null;
      },

      writeConsole() {
        const canvas = document.getElementsByTagName('canvas')[0];
        const imgData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        let rowCount = 0;
        let colCount = 0;
        let palette = [];
        let consoleImg = [];
        
        const rgbToHex = (r, g, b, a) => '#' + [r, g, b, a].map(x => {
            const hex = x.toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }).join('');
        
        for (var i = 0; i < imgData.data.length; i += 4) {
            let rgbString = rgbToHex(imgData.data[i], imgData.data[i+1], imgData.data[i+2], imgData.data[i+3]);
            if (!palette.includes(rgbString)) {
                palette.push(rgbString);
            }
            const paletteIndex = palette.indexOf(rgbString);
            consoleImg.push(paletteIndex);
        
            colCount++;
            if (colCount > canvas.width) {
                colCount = 0;
                rowCount++;
            }
        }
        
        let currPalette = null;
        let consoleString = '';
        let compressedString = '';
        const consoleOpts = [];
        const paletteMap = [];
        for (let row = 0; row < canvas.height; row++) {
            for (let col = 0; col < canvas.width; col++) {
                const tmpPalette = consoleImg[(row * canvas.width) + col];
                if (tmpPalette !== currPalette) {
                    consoleString += '%c';
                    compressedString += '0';
                    consoleOpts.push(`background: ${palette[tmpPalette]}`);
                    paletteMap.push(tmpPalette);
                    currPalette = tmpPalette;
                }
                consoleString += '  ';
                if (['0', '1'].includes(compressedString.slice(-1))) {
                  compressedString += '2';
                } else {
                  compressedString = compressedString.slice(0, -1) + String.fromCodePoint(compressedString.codePointAt(compressedString.length - 1) + 1);
                }
            }
            consoleString += '\n';
            compressedString += '1';
        }
        this.generationString = `// If you have the LZ String Library loaded (Recommended)
// https://rawgit.com/pieroxy/lz-string/master/libs/lz-string.js
function displayConsoleImage() {
  const palette = JSON.parse(LZString.decompressFromUTF16('${LZString.compressToUTF16(JSON.stringify(palette))}'));
  const consoleString = LZString.decompressFromUTF16('${LZString.compressToUTF16(consoleString)}');
  const paletteMap = JSON.parse(LZString.decompressFromUTF16('${LZString.compressToUTF16(JSON.stringify(paletteMap))}'));
  console.log(consoleString, ...paletteMap.map(a => 'background: ' + palette[a]));
}


// Works without any external libraries
function displayConsoleImage() {
  const palette = "${palette.map(a => a.substring(1)).join('|')}".split('|').map(a=>\`#\${a}\`);
  const consoleString = "${compressedString}".split('').map(b=>{return b==='0'?'%c':b==='1'?'\\n':''.padEnd((b.codePointAt(0)-49)*2,' ')}).join('');
  const paletteMap = "${paletteMap.map(a => String.fromCodePoint(256 + a)).join('')}".split('').map(c=>c.codePointAt(0)-256);
  console.log(consoleString, ...paletteMap.map(a=>'background: '+palette[a]));
}`;
        console.log(consoleString, ...consoleOpts);

        // Highlight
        setTimeout(() => {
          hljs.highlightAll();
        });
      },
      imgUrl: null,
      generationString: null,
  }))
})