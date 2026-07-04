const https = require('https');
const options = {
  hostname: 'jsearch.p.rapidapi.com',
  path: '/search-v2?query=Frontend',
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'ceeb87a502msh35fce454a8891c1p1f7d05jsnc2d1b540f888',
    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Is data.data an array?", Array.isArray(parsed.data));
      if (!Array.isArray(parsed.data)) {
        console.log("Keys in parsed.data:", Object.keys(parsed.data || {}));
      }
    } catch(e) { console.error(e); }
  });
});
req.end();
