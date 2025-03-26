
/*! THREE.Font */
THREE.Font = function (data) {
  this.data = data;
};

Object.assign(THREE.Font.prototype, {
  isFont: true,
  generateShapes: function (text, size) {
    var shapes = [];

    if (this.data && this.data.glyphs) {
      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        if (this.data.glyphs[char]) {
          shapes.push({
            text: char,
            size: size,
            path: this.data.glyphs[char]
          });
        }
      }
    }

    return shapes;
  }
});
