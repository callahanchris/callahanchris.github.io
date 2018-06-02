const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");

(async () => {
  await imagemin(["original-assets/*.jpg"], "assets/", {
    use: [
      imageminMozjpeg({
        quality: 75,
        progressive: true
      })
    ]
  });

  console.log("Images optimized");
})();
