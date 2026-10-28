# Extension Build and Publish Plan

## 1. Extension.js Build Setup

### Changes to package.json

#### Add `extension` as a devDependency
```json
"devDependencies": {
  "jsewts": "^1.0.4",
  "extension": "^1.0.0"
}
```

#### Add npm scripts
```json
"scripts": {
  "test": "node scripts/test.js",
  "build:dictionaries": "node scripts/build-dictionaries.js",
  "dev": "extension dev --browser=chrome",
  "build": "extension build --browser=chrome,edge,firefox --zip",
  "start": "extension start",
  "preview": "extension preview"
}
```

### Create public/demo/sample.html
Copy the content of `demo/sample.html` to `public/demo/sample.html`:
```html
<!doctype html>
<html lang="bo">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sample Page for Tibetan Lens</title>
    <style>
      body {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 20px 72px;
        background: #f6f0e3;
        color: #241d16;
        font: 20px/1.7 Georgia, "Palatino Linotype", serif;
      }

      h1 {
        margin-bottom: 0.4rem;
      }

      .hint {
        margin-bottom: 1.5rem;
        color: rgba(36, 29, 22, 0.76);
        font-size: 0.9rem;
      }

      .sample {
        margin-top: 1.5rem;
        padding: 1.2rem 1.4rem;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 16px 40px rgba(36, 29, 22, 0.08);
      }
    </style>
  </head>
  <body>
    <h1>Sample Page for Tibetan Lens</h1>
    <p class="hint">
      This page contains Tibetan text you can use to test the extension. For the
      best test, open any public webpage that contains Tibetan and make sure the
      extension is enabled.
    </p>

    <div class="sample" lang="bo">
      <p>བོད་སྐད་ཡིག་ལ་མི་མང་པོས་དགའ་པོ་བྱེད།</p>
      <p>ཆོས་དང་ཞི་བདེ་ནི་གལ་ཆེན་པོ་རེད།</p>
      <p>དགེ་རྒན་ཞིག་གིས་བོད་སྐད་བསླབས།</p>
      <p>ཨོཾ་ག་ཏེ་ག་ཏེ་པཱ་ར་ག་ཏེ་པཱ་ར་སཾ་ག་ཏེ་བོ་དྷི་སྭཱ་ཧཱ།</p>
    </div>
  </body>
</html>
```

### Update .gitignore
Add the following lines if they are not already present:
```
dist/
.extension/
.extensionjs/
```

## 2. publish-browser-extension Setup

### Changes to package.json

#### Add `publish-browser-extension` as a devDependency
```json
"devDependencies": {
  "jsewts": "^1.0.4",
  "extension": "^1.0.0",
  "publish-browser-extension": "^1.0.0"
}
```

#### Add npm script `publish:stores`
```json
"scripts": {
  "test": "node scripts/test.js",
  "build:dictionaries": "node scripts/build-dictionaries.js",
  "dev": "extension dev --browser=chrome",
  "build": "extension build --browser=chrome,edge,firefox --zip",
  "start": "extension start",
  "preview": "extension preview",
  "publish:stores": "publish-extension",
  "publish:init": "publish-extension init"
}
```

## 3. Safety Constraints
- Do NOT run `npm install` or any network commands.
- Do NOT move `manifest.json`.
- Do NOT delete files.
- Do NOT change the source code in `src/` except for `package.json` and `.gitignore`.