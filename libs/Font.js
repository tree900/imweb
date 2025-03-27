
/*! THREE.Font - compatible version */
THREE.Font = function (data) {
  this.data = data;
};

THREE.Font.prototype = {
  constructor: THREE.Font,
  isFont: true,

  generateShapes: function (text, size) {
    const shapes = [];

    const scale = size / this.data.resolution;
    const line_height = (this.data.boundingBox ? this.data.boundingBox.yMax : 1000) * scale;

    const glyphs = this.data.glyphs;

    let offsetX = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyph = glyphs[char] || glyphs['?'];
      if (!glyph) continue;

      if (glyph.o) {
        const path = new THREE.Shape();

        const outline = glyph._cachedOutline || (glyph._cachedOutline = glyph.o.split(' '));
        let x = 0, y = 0;

        for (let j = 0; j < outline.length; ) {
          const action = outline[j++];
          switch (action) {
            case 'm':
              x = parseFloat(outline[j++]) * scale + offsetX;
              y = parseFloat(outline[j++]) * scale;
              path.moveTo(x, y);
              break;
            case 'l':
              x = parseFloat(outline[j++]) * scale + offsetX;
              y = parseFloat(outline[j++]) * scale;
              path.lineTo(x, y);
              break;
            case 'q':
              const cpx = parseFloat(outline[j++]) * scale + offsetX;
              const cpy = parseFloat(outline[j++]) * scale;
              x = parseFloat(outline[j++]) * scale + offsetX;
              y = parseFloat(outline[j++]) * scale;
              path.quadraticCurveTo(cpx, cpy, x, y);
              break;
            case 'b':
              const cp1x = parseFloat(outline[j++]) * scale + offsetX;
              const cp1y = parseFloat(outline[j++]) * scale;
              const cp2x = parseFloat(outline[j++]) * scale + offsetX;
              const cp2y = parseFloat(outline[j++]) * scale;
              x = parseFloat(outline[j++]) * scale + offsetX;
              y = parseFloat(outline[j++]) * scale;
              path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
              break;
          }
        }

        shapes.push(path);
      }

      offsetX += glyph.ha * scale;
    }

    return shapes;
  }
};
