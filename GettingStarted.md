npx github:joshdataresources/ds-platform new acme --prefix acme → makes the project
Open it in Cursor or Claude Code
Paste the client's Figma fileKey into layouts.json + agents/fidelity.json
Ask the AI: "pull the tokens from this Figma frame" → their colors/fonts land
Ask the AI: "build [component] from [Figma link]" — repeat until the library's done
Then just ask for screens: "build the wallet screen"
npm run verify after changes — green means good
npm run serve → localhost:8128 to look at everything
