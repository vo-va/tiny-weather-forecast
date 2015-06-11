if [ -d dist ]
	then
		rm -r dist
fi
mkdir -p dist
cp LICENSE  dist/
cp README.md dist/
cp manifest.json dist/
cp -r svg/ dist/
cp background.js dist/
cp font.css dist/
cp futura.woff2 dist/
cp main.css dist/
cp setplace.js dist/
cp tick.js dist/
cp twf.png dist/
